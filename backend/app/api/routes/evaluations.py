from fastapi import APIRouter, HTTPException, status

from app.schemas.evaluation import EvaluationScore, SingleEvaluationRequest
from app.services.evaluator import get_evaluator

router = APIRouter(prefix="/evaluations", tags=["Evaluations"])


@router.post("/score", response_model=EvaluationScore, summary="Score a prompt response")
async def score_response(req: SingleEvaluationRequest) -> EvaluationScore:
    """
    Evaluates response quality using rule-based metrics or designated LLM judge model.
    """
    try:
        evaluator = get_evaluator(judge_model=req.judge_model)
        return await evaluator.evaluate(
            prompt=req.prompt,
            response=req.response,
            expected=req.expected,
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail={"code": "EVALUATION_ERROR", "message": str(e)},
        ) from e
