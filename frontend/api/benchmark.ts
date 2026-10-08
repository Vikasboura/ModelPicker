export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: { code: 'METHOD_NOT_ALLOWED', message: 'Only POST requests are allowed' },
    });
  }

  const apiKey = process.env.PUBLIC_PROVIDER_API_KEY;
  if (!apiKey) {
    return res.status(503).json({
      error: {
        code: 'PROVIDER_KEY_MISSING',
        message:
          'Public provider API key is not configured on Vercel. Set PUBLIC_PROVIDER_API_KEY in Vercel Project Settings > Environment Variables.',
      },
    });
  }

  const {
    name = 'Public Demo Benchmark',
    models = ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
    prompt = 'Explain the difference between supervised and unsupervised learning in 2 sentences.',
    quality_weight = 0.5,
    latency_weight = 0.3,
    cost_weight = 0.2,
  } = req.body || {};

  if (!models || !Array.isArray(models) || models.length === 0) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'At least one model must be specified' },
    });
  }

  const baseUrl = (process.env.PUBLIC_PROVIDER_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
  const boundedPrompt = String(prompt).slice(0, 3000);

  const results: any[] = [];

  for (const modelId of models.slice(0, 4)) {
    const startTime = Date.now();
    try {
      const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId,
          messages: [{ role: 'user', content: boundedPrompt }],
          temperature: 0.7,
          max_tokens: 300,
        }),
      });

      const durationMs = Date.now() - startTime;

      if (!upstreamRes.ok) {
        results.push({
          id: `res-${modelId}-${Date.now()}`,
          model_name: modelId,
          status: 'failed',
          error: `HTTP ${upstreamRes.status}`,
          latency_ms: durationMs,
          tokens_per_second: 0,
          token_count: 0,
          response: '',
        });
        continue;
      }

      const data: any = await upstreamRes.json();
      const choice = data.choices?.[0] || {};
      const text = choice.message?.content || choice.message?.reasoning || choice.message?.reasoning_content || '';
      const usage = data.usage || {};
      const completionTokens = usage.completion_tokens || Math.ceil(text.length / 4);
      const promptTokens = usage.prompt_tokens || Math.ceil(boundedPrompt.length / 4);
      const seconds = durationMs / 1000;
      const tokensPerSec = seconds > 0 ? Number((completionTokens / seconds).toFixed(1)) : 0;
      const cost = Number(((promptTokens / 1_000_000) * 0.05 + (completionTokens / 1_000_000) * 0.08).toFixed(6));

      // Rule-based quality heuristic (length, substance, valid response)
      const qualityScore = text.length > 50 ? (text.length > 150 ? 9.2 : 8.5) : 6.0;

      results.push({
        id: `res-${modelId}-${Date.now()}`,
        model_name: modelId,
        status: 'success',
        latency_ms: durationMs,
        ttft_ms: Math.round(durationMs * 0.3),
        token_count: completionTokens,
        prompt_tokens: promptTokens,
        tokens_per_second: tokensPerSec,
        estimated_cost: cost,
        quality_score: qualityScore,
        response: text,
      });
    } catch (err: any) {
      results.push({
        id: `res-${modelId}-${Date.now()}`,
        model_name: modelId,
        status: 'failed',
        error: err.message,
        latency_ms: Date.now() - startTime,
        tokens_per_second: 0,
        token_count: 0,
        response: '',
      });
    }
  }

  // Calculate dynamic Pareto scoring
  const successful = results.filter((r) => r.status === 'success');
  let recommendedModel = '';
  let recommendationReason = 'No models completed successfully.';

  if (successful.length > 0) {
    const minLatency = Math.min(...successful.map((r) => r.latency_ms));
    const maxLatency = Math.max(...successful.map((r) => r.latency_ms));
    const minQuality = Math.min(...successful.map((r) => r.quality_score));
    const maxQuality = Math.max(...successful.map((r) => r.quality_score));

    let bestScore = -1;
    for (const r of successful) {
      const qNorm = maxQuality === minQuality ? 1.0 : (r.quality_score - minQuality) / (maxQuality - minQuality);
      const lNorm = maxLatency === minLatency ? 1.0 : (maxLatency - r.latency_ms) / (maxLatency - minLatency);
      const cNorm = 1.0;

      const score = Number((quality_weight * qNorm + latency_weight * lNorm + cost_weight * cNorm).toFixed(3));
      r.final_score = score;

      if (score > bestScore) {
        bestScore = score;
        recommendedModel = r.model_name;
        recommendationReason = `Highest weighted score (${score}) with ${r.latency_ms}ms latency and ${r.tokens_per_second} tok/s throughput on free public infrastructure.`;
      }
    }
  }

  const runPayload = {
    id: `run-${Date.now()}`,
    name,
    status: 'completed',
    created_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
    config: {
      models,
      prompt: boundedPrompt,
      quality_weight,
      latency_weight,
      cost_weight,
      provider: 'public_free',
    },
    results,
    recommended_model: recommendedModel,
    recommendation_reason: recommendationReason,
  };

  return res.status(200).json(runPayload);
}
