from typing import Any

from app.schemas.benchmark import ModelMetricSummary, ScoringWeights


class ScoringService:
    @staticmethod
    def normalize_weights(weights: ScoringWeights) -> ScoringWeights:
        """Ensures weights sum to 1.0."""
        total = weights.quality_weight + weights.latency_weight + weights.cost_weight
        if total <= 0:
            return ScoringWeights(quality_weight=0.5, latency_weight=0.3, cost_weight=0.2)
        q = round(weights.quality_weight / total, 4)
        l_w = round(weights.latency_weight / total, 4)
        c = round(1.0 - (q + l_w), 4)
        return ScoringWeights(quality_weight=q, latency_weight=l_w, cost_weight=c)

    @staticmethod
    def calculate_normalized_scores(
        models_data: list[dict[str, Any]],
        weights: ScoringWeights,
    ) -> list[ModelMetricSummary]:
        """
        Normalizes metrics across competing models and computes weighted final scores.

        - Quality: Higher is better (0-100 baseline)
        - Latency: Lower is better (normalized to 20-100 scale)
        - Cost: Lower is better (normalized to 20-100 scale, neutral 50 if missing)
        """
        if not models_data:
            return []

        weights = ScoringService.normalize_weights(weights)

        # Extract latencies and costs for min-max scaling
        latencies = [
            m.get("avg_latency_ms", 0.0)
            for m in models_data
            if m.get("avg_latency_ms") is not None and m.get("avg_latency_ms") > 0
        ]
        costs = [
            m.get("total_cost", 0.0)
            for m in models_data
            if m.get("total_cost") is not None and m.get("total_cost") >= 0
        ]

        min_lat = min(latencies) if latencies else 0.0
        max_lat = max(latencies) if latencies else 0.0
        min_cost = min(costs) if costs else 0.0
        max_cost = max(costs) if costs else 0.0

        summaries: list[ModelMetricSummary] = []

        for m in models_data:
            model_name = m["model_name"]
            avg_qual = float(m.get("avg_quality_score", 0.0))
            avg_lat = float(m.get("avg_latency_ms", 0.0))
            tot_cost = m.get("total_cost")

            # 1. Quality score (0-100)
            q_score = max(0.0, min(100.0, avg_qual))

            # 2. Latency score (lower latency = higher score)
            if not latencies or max_lat == min_lat:
                l_score = 100.0 if avg_lat > 0 else 0.0
            else:
                # Scaled between 25.0 and 100.0
                ratio = (max_lat - avg_lat) / (max_lat - min_lat)
                l_score = 25.0 + (ratio * 75.0)

            # 3. Cost score (lower cost = higher score)
            if tot_cost is None:
                c_score = 50.0  # Neutral if pricing unavailable
            elif not costs or max_cost == min_cost:
                c_score = 100.0
            else:
                ratio = (max_cost - tot_cost) / (max_cost - min_cost)
                c_score = 25.0 + (ratio * 75.0)

            # Composite final score
            final = (
                (q_score * weights.quality_weight)
                + (l_score * weights.latency_weight)
                + (c_score * weights.cost_weight)
            )

            summaries.append(
                ModelMetricSummary(
                    model_name=model_name,
                    final_score=round(final, 2),
                    quality_score=round(q_score, 2),
                    latency_score=round(l_score, 2),
                    cost_score=round(c_score, 2),
                    avg_latency_ms=round(avg_lat, 2),
                    avg_ttft_ms=(
                        round(m["avg_ttft_ms"], 2) if m.get("avg_ttft_ms") is not None else None
                    ),
                    avg_tokens_per_second=round(m.get("avg_tokens_per_second", 0.0), 2),
                    total_tokens=int(m.get("total_tokens", 0)),
                    total_cost=round(tot_cost, 8) if tot_cost is not None else None,
                    success_rate=round(m.get("success_rate", 1.0), 2),
                )
            )

        # Sort descending by final score
        summaries.sort(key=lambda x: x.final_score, reverse=True)

        # Identify fastest, cheapest, highest quality
        fastest = min(summaries, key=lambda x: x.avg_latency_ms if x.avg_latency_ms > 0 else 999999)
        highest_q = max(summaries, key=lambda x: x.quality_score)
        models_with_cost = [s for s in summaries if s.total_cost is not None]
        cheapest = min(models_with_cost, key=lambda x: x.total_cost) if models_with_cost else None

        for idx, s in enumerate(summaries, start=1):
            s.rank = idx
            s.is_recommended = idx == 1
            s.is_fastest = s.model_name == fastest.model_name
            s.is_highest_quality = s.model_name == highest_q.model_name
            s.is_cheapest = bool(cheapest and s.model_name == cheapest.model_name)

            # Generate dynamic human-readable recommendation reasons
            reasons = []
            if s.is_recommended:
                reasons.append("Highest overall score across weighted criteria")
            if s.is_highest_quality:
                reasons.append(f"Leading output quality ({s.quality_score}/100)")
            if s.is_fastest:
                reasons.append(f"Lowest response latency ({s.avg_latency_ms} ms)")
            if s.is_cheapest:
                reasons.append(f"Most cost-effective (${s.total_cost:.6f})")
            if s.avg_tokens_per_second > 30.0:
                reasons.append(f"High generation throughput ({s.avg_tokens_per_second} tok/s)")

            s.recommendation_reasons = reasons

        return summaries


scoring_service = ScoringService()
