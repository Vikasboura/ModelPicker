# ModelPicker Evaluation & Scoring Methodology

ModelPicker provides transparent, deterministic, and reproducible evaluation for open-weight language models. This document describes the benchmarking engine, scoring mathematics, and recommendation algorithms.

---

## 1. Benchmarking Workflow

To guarantee fairness across all competing models:
1. **Identical Generation Conditions**: Every selected model receives the **exact same prompts** with identical hyper-parameters (`temperature`, `max_tokens`).
2. **Warm-Up Isolation**: Ollama models can experience cold-start delays during weight loading. ModelPicker performs configurable warm-up requests (`WARMUP_REQUESTS=1`) prior to benchmark timing. Warm-up latency is isolated and **excluded** from measured benchmark metrics.
3. **Bounded Concurrency**: Requests are dispatched concurrently up to `MAX_CONCURRENT_REQUESTS=2` to optimize throughput without saturating host CPU or memory bandwidth.
4. **Wall-Clock Measurements**:
   - `Latency (ms)`: Measured end-to-end using high-precision wall-clock counters (`time.perf_counter()`).
   - `TTFT (ms)`: Time To First Token measured during streaming.
   - `Throughput`: Generated token count divided by generation time in seconds (`tok/s`).

---

## 2. Quality Evaluation Subsystem

ModelPicker supports pluggable evaluators adhering to the `BaseEvaluator` contract:

### A. Deterministic Rule-Based Evaluator (`RuleBasedEvaluator`)
Used by default for fast, zero-cost, fully reproducible scoring without requiring an external judge model:
- **Correctness / Relevance (0–100)**:
  - If a reference answer is provided: Evaluates token recall ($R$), Jaccard overlap ($J$), and key clause matches ($M$):
    $$\text{Correctness} = \min\left(100, 0.70 \times R + 0.20 \times J + 0.10 \times M\right)$$
  - If no reference answer is provided: Measures semantic overlap between prompt keywords and generated response.
- **Completeness (0–100)**:
  - Evaluates response length adequacy against typical question requirements (penalizing responses under 15 words).
  - Checks for grammatical completeness and penalizes mid-sentence truncations.
- **Composite Quality Score**:
  $$\text{Quality Score} = (0.60 \times \text{Correctness}) + (0.40 \times \text{Completeness})$$

### B. LLM Judge Evaluator (`LLMJudgeEvaluator`)
Allows an external model (e.g. `llama3.3:70b`, `mistral:instruct`) to act as an impartial judge:
- **Anti-Self-Judging Rule**: Model $A$ is **strictly prohibited** from evaluating Model $A$. If the judge model matches the evaluated model, ModelPicker automatically falls back to deterministic scoring with an explicit audit note in the evaluation record.

---

## 3. Weighted Scoring & Normalization

Because quality (0–100), latency (ms), and cost (USD) use different units and directions, ModelPicker normalizes all metrics to a uniform 0–100 scale:

### Normalization Formulas

1. **Quality Score ($S_q$)**:
   $$\text{Higher is better} \implies S_q = \text{Evaluator Score} \in [0, 100]$$

2. **Latency Score ($S_l$)**:
   $$\text{Lower is better}$$
   For models benchmarked in the run, with minimum latency $L_{min}$ and maximum latency $L_{max}$:
   $$S_l = 25.0 + 75.0 \times \left(\frac{L_{max} - L}{L_{max} - L_{min}}\right)$$
   *(The fastest model receives 100; the slowest receives 25)*

3. **Cost Score ($S_c$)**:
   $$\text{Lower is better}$$
   If cost data is missing from `pricing.yaml`, the model receives a neutral score ($S_c = 50$).
   For models with pricing, between minimum cost $C_{min}$ and maximum cost $C_{max}$:
   $$S_c = 25.0 + 75.0 \times \left(\frac{C_{max} - C}{C_{max} - C_{min}}\right)$$

### Final Composite Score Formula
Given user-configurable weights $W_q$ (Quality), $W_l$ (Latency), and $W_c$ (Cost), normalized such that $W_q + W_l + W_c = 1.0$:

$$\text{Final Score} = (S_q \times W_q) + (S_l \times W_l) + (S_c \times W_c)$$

---

## 4. Dynamic Model Recommendation Engine

The system dynamically ranks all evaluated models by `Final Score` descending:
- **🏆 Recommended Model**: Rank #1 model achieving the optimal balance under the user's weights.
- **Dynamic Reason Synthesis**: Human-readable rationale bullets generated from quantitative criteria (e.g. "Highest overall score", "Lowest response latency at 180 ms", "Most cost-effective at $0.00004").
- **Specialty Badges**:
  - ⚡ **Fastest Model**: Minimum average latency.
  - 💰 **Cheapest Model**: Minimum total estimated cost.
  - 🎯 **Highest Quality Model**: Maximum quality score.

---

## 5. Dataset Formats

ModelPicker supports both **JSON** and **JSONL** datasets:

### JSON Array (`.json`)
```json
[
  {
    "id": "q1",
    "prompt": "What is machine learning?",
    "expected": "Machine learning is a field of artificial intelligence focused on building systems that learn from data."
  }
]
```

### JSON Lines (`.jsonl`)
```jsonl
{"id": "q1", "prompt": "What is machine learning?", "expected": "Machine learning is..."}
{"id": "q2", "prompt": "Explain REST APIs.", "expected": "A REST API..."}
```
Validation ensures required fields are non-empty and provides a 10-row preview before saving to the database.
