import pytest

from app.schemas.benchmark import ScoringWeights
from app.services.evaluator import RuleBasedEvaluator
from app.services.scoring import scoring_service


def test_weights_auto_normalization():
    weights = ScoringWeights(quality_weight=0.5, latency_weight=0.3, cost_weight=0.2)
    assert weights.quality_weight == 0.5
    assert weights.latency_weight == 0.3
    assert weights.cost_weight == 0.2

    # Non-summing weights
    unnormalized = ScoringWeights(quality_weight=1.0, latency_weight=1.0, cost_weight=2.0)
    norm = scoring_service.normalize_weights(unnormalized)
    assert round(norm.quality_weight + norm.latency_weight + norm.cost_weight, 2) == 1.0


def test_scoring_normalization_and_ranking():
    models_data = [
        {
            "model_name": "model_fast_low_cost",
            "avg_quality_score": 80.0,
            "avg_latency_ms": 100.0,  # fastest
            "total_cost": 0.0001,  # lowest cost
            "avg_tokens_per_second": 50.0,
            "total_tokens": 500,
        },
        {
            "model_name": "model_slow_high_cost",
            "avg_quality_score": 90.0,  # slightly higher quality
            "avg_latency_ms": 1000.0,  # much slower
            "total_cost": 0.0010,  # 10x cost
            "avg_tokens_per_second": 15.0,
            "total_tokens": 500,
        },
    ]

    weights = ScoringWeights(quality_weight=0.4, latency_weight=0.3, cost_weight=0.3)
    summaries = scoring_service.calculate_normalized_scores(models_data, weights)

    assert len(summaries) == 2
    # Fastest model gets 100 latency score, lowest cost gets 100 cost score
    fast_model = next(s for s in summaries if s.model_name == "model_fast_low_cost")
    slow_model = next(s for s in summaries if s.model_name == "model_slow_high_cost")

    assert fast_model.latency_score > slow_model.latency_score
    assert fast_model.cost_score > slow_model.cost_score
    assert fast_model.is_fastest is True
    assert fast_model.is_cheapest is True
    assert slow_model.is_highest_quality is True
    assert summaries[0].is_recommended is True
    assert len(summaries[0].recommendation_reasons) > 0


@pytest.mark.asyncio
async def test_rule_based_evaluator():
    evaluator = RuleBasedEvaluator()

    # Exact or highly relevant answer
    prompt = "What is machine learning?"
    expected = (
        "Machine learning is a subset of artificial intelligence where algorithms learn from data."
    )
    response = "Machine learning is a branch of artificial intelligence where computer systems learn from data to solve problems."

    result = await evaluator.evaluate(prompt, response, expected)
    assert result.correctness_score > 60.0
    assert result.completeness_score > 60.0
    assert result.overall_quality_score > 60.0

    # Empty response
    empty_result = await evaluator.evaluate(prompt, "   ", expected)
    assert empty_result.overall_quality_score == 0.0
