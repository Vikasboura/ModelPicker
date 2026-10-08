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
          'Public provider API key is not configured on Vercel. Set PUBLIC_PROVIDER_API_KEY in your Vercel Project Settings > Environment Variables, or switch to Local Ollama mode.',
      },
    });
  }

  const { model, prompt, temperature = 0.7, max_tokens = 512, stream = false } = req.body || {};

  if (!model || !prompt) {
    return res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Both "model" and "prompt" are required' },
    });
  }

  // Abuse protection limits for free demo
  const truncatedPrompt = String(prompt).slice(0, 4000);
  const boundedTokens = Math.min(Math.max(Number(max_tokens) || 512, 1), 1024);
  const boundedTemp = Math.min(Math.max(Number(temperature) || 0.7, 0.0), 2.0);

  const baseUrl = (process.env.PUBLIC_PROVIDER_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');

  const payload = {
    model,
    messages: [{ role: 'user', content: truncatedPrompt }],
    temperature: boundedTemp,
    max_tokens: boundedTokens,
    stream: Boolean(stream),
  };

  const startTime = Date.now();

  try {
    const upstreamRes = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    if (upstreamRes.status === 429) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Public demo rate limit reached. Please wait a few moments and try again.',
        },
      });
    }

    if (!upstreamRes.ok) {
      const errText = await upstreamRes.text();
      return res.status(upstreamRes.status).json({
        error: {
          code: `UPSTREAM_${upstreamRes.status}`,
          message: `Public provider returned error (${upstreamRes.status}): ${errText}`,
        },
      });
    }

    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const reader = upstreamRes.body?.getReader();
      if (!reader) {
        return res.status(500).json({ error: { message: 'Streaming reader unavailable' } });
      }

      const decoder = new TextDecoder();
      let fullText = '';
      let firstTokenTime: number | null = null;
      let tokenCount = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunkStr = decoder.decode(value, { stream: true });
        const lines = chunkStr.split('\n');

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.replace('data: ', '').trim();
          if (dataStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(dataStr);
            const token = parsed.choices?.[0]?.delta?.content || '';
            if (token) {
              if (firstTokenTime === null) {
                firstTokenTime = Date.now();
              }
              fullText += token;
              tokenCount++;
              res.write(`data: ${JSON.stringify({ type: 'token', chunk: token })}\n\n`);
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }

      const totalLatency = Date.now() - startTime;
      const ttft = firstTokenTime ? firstTokenTime - startTime : totalLatency;
      const tokSec = totalLatency > 0 ? (tokenCount / (totalLatency / 1000)).toFixed(1) : 0;

      res.write(
        `data: ${JSON.stringify({
          type: 'done',
          model,
          response: fullText,
          latency_ms: totalLatency,
          ttft_ms: ttft,
          token_count: tokenCount,
          prompt_tokens: Math.ceil(truncatedPrompt.length / 4),
          tokens_per_second: Number(tokSec),
          estimated_cost: 0.0,
          timestamp: new Date().toISOString(),
        })}\n\n`
      );
      return res.end();
    }

    const data: any = await upstreamRes.json();
    const durationMs = Date.now() - startTime;
    const choice = data.choices?.[0] || {};
    const text = choice.message?.content || '';
    const usage = data.usage || {};

    const promptTokens = usage.prompt_tokens || Math.ceil(truncatedPrompt.length / 4);
    const completionTokens = usage.completion_tokens || Math.ceil(text.length / 4);
    const seconds = durationMs / 1000;
    const tokensPerSec = seconds > 0 ? Number((completionTokens / seconds).toFixed(1)) : 0;

    // Calculate estimated commercial cost based on standard model rates
    const cost = Number(((promptTokens / 1_000_000) * 0.05 + (completionTokens / 1_000_000) * 0.08).toFixed(6));

    return res.status(200).json({
      model,
      response: text,
      latency_ms: durationMs,
      ttft_ms: Math.round(durationMs * 0.35),
      token_count: completionTokens,
      prompt_tokens: promptTokens,
      tokens_per_second: tokensPerSec,
      estimated_cost: cost,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: err.message || 'An error occurred while executing inference',
      },
    });
  }
}
