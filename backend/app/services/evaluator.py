import json
import logging
import re
from abc import ABC, abstractmethod

from app.schemas.evaluation import EvaluationScore
from app.services.ollama import OllamaService, ollama_service

logger = logging.getLogger(__name__)


class BaseEvaluator(ABC):
    @abstractmethod
    async def evaluate(
        self,
        prompt: str,
        response: str,
        expected: str | None = None,
        model_name: str | None = None,
    ) -> EvaluationScore:
        """Evaluates model response and returns standard score."""
        pass


class RuleBasedEvaluator(BaseEvaluator):
    """
    Deterministic rule-based evaluator computing:
    1. Correctness/relevance: Lexical and n-gram overlap with expected answer or prompt context.
    2. Response completeness: Length adequacy, structural depth, and lack of truncation.
    3. Composite quality score (0-100).
    """

    def _tokenize(self, text: str) -> set[str]:
        # Lowercase alphanumeric tokens without basic stop words
        words = set(re.findall(r"\b[a-zA-Z0-9_]{3,}\b", text.lower()))
        common_stops = {
            "the",
            "and",
            "this",
            "that",
            "with",
            "from",
            "your",
            "have",
            "were",
            "will",
            "what",
            "when",
            "which",
            "about",
            "into",
            "more",
            "than",
        }
        return words - common_stops

    async def evaluate(
        self,
        prompt: str,
        response: str,
        expected: str | None = None,
        model_name: str | None = None,
    ) -> EvaluationScore:
        cleaned_response = response.strip()
        if not cleaned_response:
            return EvaluationScore(
                correctness_score=0.0,
                completeness_score=0.0,
                overall_quality_score=0.0,
                feedback="Response is empty or contains only whitespace.",
                evaluator_type="rule_based",
            )

        resp_tokens = self._tokenize(cleaned_response)
        prompt_tokens = self._tokenize(prompt)

        # 1. Correctness / Relevance calculation
        if expected and expected.strip():
            expected_tokens = self._tokenize(expected)
            if expected_tokens:
                intersection = resp_tokens.intersection(expected_tokens)
                # Jaccard and recall ratio
                recall = len(intersection) / len(expected_tokens)
                jaccard = (
                    len(intersection) / len(resp_tokens.union(expected_tokens))
                    if (resp_tokens or expected_tokens)
                    else 0.0
                )
                # Combine recall with presence of key phrases
                phrase_matches = sum(
                    1
                    for sentence in expected.split(".")
                    if len(sentence.strip()) > 10
                    and sentence.strip().lower() in cleaned_response.lower()
                )
                correctness = min(100.0, (recall * 70.0 + jaccard * 20.0 + phrase_matches * 10.0))
            else:
                correctness = 70.0
        else:
            # When no expected reference is provided, calculate relevance to prompt tokens
            if prompt_tokens:
                relevance_overlap = len(resp_tokens.intersection(prompt_tokens)) / len(
                    prompt_tokens
                )
                correctness = min(100.0, max(40.0, relevance_overlap * 100.0))
            else:
                correctness = 70.0

        # 2. Completeness calculation
        # A good answer should provide sufficient depth without being cut off mid-sentence
        word_count = len(cleaned_response.split())
        has_punctuation_end = cleaned_response[-1] in {".", "!", "?", '"', "'", "`", ")", "}"}

        # Baseline length score: 20-250 words is typical good range for eval prompts
        if word_count < 5:
            length_factor = 20.0
        elif word_count < 15:
            length_factor = 50.0
        elif word_count <= 400:
            length_factor = 95.0
        else:
            length_factor = 85.0  # Slightly penalize excessive verbosity

        punctuation_penalty = 0.0 if has_punctuation_end else 15.0
        completeness = max(0.0, min(100.0, length_factor - punctuation_penalty))

        # 3. Overall quality score
        overall_quality = round((correctness * 0.6) + (completeness * 0.4), 2)
        correctness = round(correctness, 2)
        completeness = round(completeness, 2)

        feedback = (
            f"Rule-based evaluation: {word_count} words generated. "
            f"Concept overlap: {correctness}%, structural completeness: {completeness}%."
        )

        return EvaluationScore(
            correctness_score=correctness,
            completeness_score=completeness,
            overall_quality_score=overall_quality,
            feedback=feedback,
            evaluator_type="rule_based",
        )


class LLMJudgeEvaluator(BaseEvaluator):
    """
    LLM Judge Evaluator using a designated separate judge model.
    Enforces that model A cannot judge model A.
    """

    def __init__(
        self,
        judge_model: str,
        ollama_client: OllamaService | None = None,
        allow_self_judge: bool = False,
    ):
        self.judge_model = judge_model
        self.ollama = ollama_client or ollama_service
        self.allow_self_judge = allow_self_judge
        self.fallback = RuleBasedEvaluator()

    async def evaluate(
        self,
        prompt: str,
        response: str,
        expected: str | None = None,
        model_name: str | None = None,
    ) -> EvaluationScore:
        # Enforce distinct judge rule
        if model_name and not self.allow_self_judge:
            if (
                model_name.strip().lower() == self.judge_model.strip().lower()
                or model_name.split(":")[0] == self.judge_model.split(":")[0]
            ):
                logger.warning(
                    "Self-judging prevented: Model '%s' cannot judge itself. Falling back to rule-based evaluator.",
                    model_name,
                )
                score = await self.fallback.evaluate(prompt, response, expected, model_name)
                score.feedback = (
                    f"[Self-Judge Prevented] {self.judge_model} cannot judge {model_name}. "
                    + (score.feedback or "")
                )
                return score

        judge_prompt = f"""You are an impartial AI judge evaluating the quality of an LLM response.
Prompt given to the model:
\"\"\"{prompt}\"\"\"

Expected or Reference Answer:
\"\"\"{expected or "Not provided"}\"\"\"

Model Output to Evaluate:
\"\"\"{response}\"\"\"

Evaluate the model output strictly on:
1. Correctness (0 to 100): Is the factual information accurate and relevant?
2. Completeness (0 to 100): Does the response fully address the question?
3. Overall Quality (0 to 100): Overall rating of clarity, coherence, and utility.

Respond ONLY with valid JSON in this exact structure:
{{
  "correctness": <number 0-100>,
  "completeness": <number 0-100>,
  "overall_quality": <number 0-100>,
  "feedback": "<short explanation>"
}}"""

        try:
            result = await self.ollama.generate(
                model=self.judge_model,
                prompt=judge_prompt,
                temperature=0.0,
                max_tokens=256,
            )
            raw_text = result.get("response", "").strip()

            # Attempt to parse json from raw output
            match = re.search(r"\{.*?\}", raw_text, re.DOTALL)
            if match:
                parsed = json.loads(match.group(0))
                correctness = float(parsed.get("correctness", 50.0))
                completeness = float(parsed.get("completeness", 50.0))
                overall = float(parsed.get("overall_quality", 50.0))
                fb = parsed.get("feedback", "LLM Judge evaluation completed.")

                return EvaluationScore(
                    correctness_score=max(0.0, min(100.0, correctness)),
                    completeness_score=max(0.0, min(100.0, completeness)),
                    overall_quality_score=max(0.0, min(100.0, overall)),
                    feedback=f"[Judge: {self.judge_model}] {fb}",
                    evaluator_type="llm_judge",
                )
        except Exception as e:
            logger.warning("LLM Judge evaluation failed (%s). Falling back to rule-based.", e)

        score = await self.fallback.evaluate(prompt, response, expected, model_name)
        score.feedback = f"[Judge fallback due to error] Evaluated using deterministic metrics. {score.feedback or ''}"
        return score


def get_evaluator(
    judge_model: str | None = None,
    allow_self_judge: bool = False,
) -> BaseEvaluator:
    """Factory function returning the appropriate evaluator instance."""
    if judge_model:
        return LLMJudgeEvaluator(judge_model=judge_model, allow_self_judge=allow_self_judge)
    return RuleBasedEvaluator()
