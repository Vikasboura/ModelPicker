import asyncio
import json
import logging
import time
from pathlib import Path
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal
from app.models.benchmark import BenchmarkResult, BenchmarkRun
from app.models.dataset import DatasetEntity
from app.models.evaluation import EvaluationRecord
from app.schemas.benchmark import (
    BenchmarkStartRequest,
    BenchmarkSummary,
)
from app.schemas.dataset import DatasetItem
from app.services.evaluator import get_evaluator
from app.services.model_registry import model_registry_service
from app.services.ollama import (
    ModelNotFoundError,
    OllamaService,
    OllamaServiceError,
    OllamaUnavailableError,
    ollama_service,
)
from app.services.scoring import scoring_service

logger = logging.getLogger(__name__)


class BenchmarkService:
    def __init__(
        self,
        ollama_client: OllamaService | None = None,
    ):
        self.ollama = ollama_client or ollama_service
        self.semaphore = asyncio.Semaphore(settings.max_concurrent_requests)

    def load_dataset_prompts(
        self, db: Session, dataset_id: str | None
    ) -> tuple[str, list[DatasetItem]]:
        """Loads prompt items either from database dataset or from default data/eval.json."""
        if dataset_id:
            ds = db.query(DatasetEntity).filter(DatasetEntity.id == dataset_id).first()
            if ds and ds.data:
                items = [DatasetItem(**item) for item in ds.data]
                return ds.name, items

        # Fallback to default eval.json
        eval_path = Path(settings.default_eval_file_path)
        if not eval_path.exists():
            alt_path = Path("..") / eval_path
            if alt_path.exists():
                eval_path = alt_path

        if eval_path.exists():
            with open(eval_path, encoding="utf-8") as f:
                data = json.load(f)
                items = [DatasetItem(**item) for item in data]
                return "Default Evaluation Dataset", items

        # Minimal fallback if file missing
        default_items = [
            DatasetItem(
                id="default-1",
                prompt="Explain the difference between supervised and unsupervised learning.",
                expected="Supervised learning uses labeled training data, while unsupervised learning discovers patterns from unlabeled data.",
            ),
            DatasetItem(
                id="default-2",
                prompt="Write a Python function to check if a word is a palindrome.",
                expected="def is_palindrome(word: str) -> bool:\n    return word == word[::-1]",
            ),
        ]
        return "Built-in Evaluation Set", default_items

    async def _warmup_model(self, model: str, warmup_count: int) -> dict[str, Any]:
        """
        Executes warm-up request(s) before benchmarking.
        Warm-up times are recorded separately and NOT included in benchmark stats.
        """
        if warmup_count <= 0:
            return {"warmed_up": True, "warmup_latencies_ms": []}

        latencies = []
        for i in range(warmup_count):
            try:
                start = time.perf_counter()
                await self.ollama.generate(
                    model=model,
                    prompt="Warmup ping.",
                    max_tokens=5,
                )
                lat = (time.perf_counter() - start) * 1000.0
                latencies.append(round(lat, 2))
                logger.info(
                    "Warmed up model '%s' (req %d/%d) in %.1f ms",
                    model,
                    i + 1,
                    warmup_count,
                    lat,
                )
            except Exception as e:
                logger.warning("Warm-up ping failed for model '%s': %s", model, e)
                latencies.append(None)
        return {"warmed_up": True, "warmup_latencies_ms": latencies}

    async def execute_benchmark(
        self,
        run_id: str,
        request: BenchmarkStartRequest,
    ) -> None:
        """
        Executes complete benchmark workflow across models and prompts with concurrency control.
        """
        db = SessionLocal()
        try:
            run = db.query(BenchmarkRun).filter(BenchmarkRun.id == run_id).first()
            if not run:
                logger.error("Benchmark run '%s' not found", run_id)
                return

            run.status = "RUNNING"
            db.commit()

            dataset_name, prompts = self.load_dataset_prompts(db, request.dataset_id)
            run.dataset_name = dataset_name
            db.commit()

            evaluator = get_evaluator(request.judge_model)

            # 1. Warm-up each model
            warmup_stats = {}
            for model_name in request.models:
                warmup_stats[model_name] = await self._warmup_model(
                    model_name, request.warmup_requests
                )

            # 2. Run benchmark matrix
            results_to_save: list[BenchmarkResult] = []

            for model_name in request.models:
                for item in prompts:
                    async with self.semaphore:
                        try:
                            # Strict condition guarantee: Every model gets exact same prompt & params
                            gen_result = await self.ollama.generate(
                                model=model_name,
                                prompt=item.prompt,
                                temperature=request.temperature,
                                max_tokens=request.max_tokens,
                            )

                            resp_text = gen_result["response"]
                            lat_ms = gen_result["latency_ms"]
                            tok_count = gen_result["token_count"]
                            prompt_toks = gen_result.get("prompt_tokens", 0)
                            tok_sec = gen_result["tokens_per_second"]

                            # Cost calculation
                            cost = model_registry_service.calculate_cost(
                                model_name=model_name,
                                prompt_tokens=prompt_toks,
                                completion_tokens=tok_count,
                            )

                            # Quality evaluation
                            eval_score = await evaluator.evaluate(
                                prompt=item.prompt,
                                response=resp_text,
                                expected=item.expected,
                                model_name=model_name,
                            )

                            b_res = BenchmarkResult(
                                benchmark_run_id=run.id,
                                model_name=model_name,
                                prompt_id=item.id,
                                prompt_text=item.prompt,
                                expected_output=item.expected,
                                response=resp_text,
                                latency_ms=lat_ms,
                                ttft_ms=gen_result.get("ttft_ms"),
                                token_count=tok_count,
                                tokens_per_second=tok_sec,
                                estimated_cost=cost,
                                quality_score=eval_score.overall_quality_score,
                                final_score=None,  # Normalized later
                                error=None,
                            )

                            # Record evaluation record
                            eval_rec = EvaluationRecord(
                                benchmark_result_id=b_res.id,
                                evaluator_type=eval_score.evaluator_type,
                                correctness_score=eval_score.correctness_score,
                                completeness_score=eval_score.completeness_score,
                                overall_score=eval_score.overall_quality_score,
                                feedback=eval_score.feedback,
                            )
                            db.add(b_res)
                            db.add(eval_rec)
                            results_to_save.append(b_res)

                        except (
                            OllamaUnavailableError,
                            ModelNotFoundError,
                            OllamaServiceError,
                        ) as err:
                            logger.error(
                                "Model %s failed on prompt %s: %s",
                                model_name,
                                item.id,
                                err.message,
                            )
                            b_res = BenchmarkResult(
                                benchmark_run_id=run.id,
                                model_name=model_name,
                                prompt_id=item.id,
                                prompt_text=item.prompt,
                                expected_output=item.expected,
                                response=None,
                                latency_ms=0.0,
                                token_count=0,
                                tokens_per_second=0.0,
                                estimated_cost=None,
                                quality_score=0.0,
                                final_score=0.0,
                                error=f"{err.code}: {err.message}",
                            )
                            db.add(b_res)
                            results_to_save.append(b_res)
                        except Exception as e:
                            logger.error("Unexpected error benchmarking %s: %s", model_name, e)
                            b_res = BenchmarkResult(
                                benchmark_run_id=run.id,
                                model_name=model_name,
                                prompt_id=item.id,
                                prompt_text=item.prompt,
                                expected_output=item.expected,
                                response=None,
                                latency_ms=0.0,
                                token_count=0,
                                tokens_per_second=0.0,
                                estimated_cost=None,
                                quality_score=0.0,
                                final_score=0.0,
                                error=str(e),
                            )
                            db.add(b_res)
                            results_to_save.append(b_res)

                        db.commit()

            # 3. Aggregate metrics per model
            models_agg: dict[str, dict[str, Any]] = {}
            for m in request.models:
                models_agg[m] = {
                    "model_name": m,
                    "latencies": [],
                    "ttfts": [],
                    "tokens_per_sec": [],
                    "tokens": 0,
                    "costs": [],
                    "qualities": [],
                    "errors": 0,
                    "total_prompts": 0,
                }

            for res in results_to_save:
                m_stat = models_agg[res.model_name]
                m_stat["total_prompts"] += 1
                if res.error:
                    m_stat["errors"] += 1
                else:
                    if res.latency_ms is not None:
                        m_stat["latencies"].append(res.latency_ms)
                    if res.ttft_ms is not None:
                        m_stat["ttfts"].append(res.ttft_ms)
                    if res.tokens_per_second is not None:
                        m_stat["tokens_per_sec"].append(res.tokens_per_second)
                    if res.token_count is not None:
                        m_stat["tokens"] += res.token_count
                    if res.estimated_cost is not None:
                        m_stat["costs"].append(res.estimated_cost)
                    if res.quality_score is not None:
                        m_stat["qualities"].append(res.quality_score)

            models_data = []
            for m, data in models_agg.items():
                tot_prompts = max(1, data["total_prompts"])
                success_rate = (tot_prompts - data["errors"]) / tot_prompts

                avg_lat = (
                    sum(data["latencies"]) / len(data["latencies"]) if data["latencies"] else 0.0
                )
                avg_ttft = sum(data["ttfts"]) / len(data["ttfts"]) if data["ttfts"] else None
                avg_tps = (
                    sum(data["tokens_per_sec"]) / len(data["tokens_per_sec"])
                    if data["tokens_per_sec"]
                    else 0.0
                )
                avg_qual = (
                    sum(data["qualities"]) / len(data["qualities"]) if data["qualities"] else 0.0
                )
                tot_cost = sum(data["costs"]) if data["costs"] else None

                models_data.append(
                    {
                        "model_name": m,
                        "avg_latency_ms": avg_lat,
                        "avg_ttft_ms": avg_ttft,
                        "avg_tokens_per_second": avg_tps,
                        "avg_quality_score": avg_qual,
                        "total_tokens": data["tokens"],
                        "total_cost": tot_cost,
                        "success_rate": success_rate,
                    }
                )

            # 4. Compute normalized rankings and dynamic recommendations
            rankings = scoring_service.calculate_normalized_scores(models_data, request.weights)

            rec_model = rankings[0].model_name if rankings else None
            fastest_model = next((r.model_name for r in rankings if r.is_fastest), None)
            cheapest_model = next((r.model_name for r in rankings if r.is_cheapest), None)
            highest_q_model = next((r.model_name for r in rankings if r.is_highest_quality), None)

            summary = BenchmarkSummary(
                rankings=rankings,
                recommended_model=rec_model,
                fastest_model=fastest_model,
                cheapest_model=cheapest_model,
                highest_quality_model=highest_q_model,
                weights_used=request.weights,
            )

            # Save summary and update individual final_score for each prompt
            run.summary = summary.model_dump()
            run.status = "COMPLETED"

            # Assign final_scores to individual items based on model final score
            model_scores_map = {r.model_name: r.final_score for r in rankings}
            for res in results_to_save:
                res.final_score = model_scores_map.get(res.model_name, 0.0)

            db.commit()
            logger.info("Benchmark run '%s' completed successfully.", run.id)

        except Exception as e:
            logger.exception("Benchmark run '%s' encountered fatal failure: %s", run_id, e)
            if run:
                run.status = "FAILED"
                run.error_message = str(e)
                db.commit()
        finally:
            db.close()


benchmark_service = BenchmarkService()
