from pydantic import BaseModel, Field


class EvaluationScore(BaseModel):
    correctness_score: float = Field(
        ..., ge=0.0, le=100.0, description="Correctness/relevance score (0-100)"
    )
    completeness_score: float = Field(
        ..., ge=0.0, le=100.0, description="Completeness/coverage score (0-100)"
    )
    overall_quality_score: float = Field(
        ..., ge=0.0, le=100.0, description="Composite quality score (0-100)"
    )
    feedback: str | None = Field(None, description="Detailed score feedback / breakdown")
    evaluator_type: str = Field("rule_based", description="Evaluator used")


class SingleEvaluationRequest(BaseModel):
    prompt: str
    expected: str | None = None
    response: str
    judge_model: str | None = None
