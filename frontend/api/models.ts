export const PUBLIC_MODELS = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    provider: 'Groq (Free Cloud)',
    parameter_count: '70B',
    context_length: 131072,
    input_price: 0.59,
    output_price: 0.79,
    enabled: true,
    installed: true,
    metadata: {
      source: 'public_free',
      family: 'llama',
      speed: 'Up to 250+ tok/s',
    },
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    provider: 'Groq (Free Cloud)',
    parameter_count: '8B',
    context_length: 131072,
    input_price: 0.05,
    output_price: 0.08,
    enabled: true,
    installed: true,
    metadata: {
      source: 'public_free',
      family: 'llama',
      speed: 'Up to 500+ tok/s',
    },
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B 32k',
    provider: 'Groq (Free Cloud)',
    parameter_count: '46.7B',
    context_length: 32768,
    input_price: 0.24,
    output_price: 0.24,
    enabled: true,
    installed: true,
    metadata: {
      source: 'public_free',
      family: 'mistral',
      speed: 'Up to 300+ tok/s',
    },
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B IT',
    provider: 'Groq (Free Cloud)',
    parameter_count: '9B',
    context_length: 8192,
    input_price: 0.20,
    output_price: 0.20,
    enabled: true,
    installed: true,
    metadata: {
      source: 'public_free',
      family: 'gemma',
      speed: 'Up to 350+ tok/s',
    },
  },
];

export default async function handler(req: any, res: any) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.PUBLIC_PROVIDER_API_KEY;
  const baseUrl = (process.env.PUBLIC_PROVIDER_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');

  if (apiKey) {
    try {
      const upstreamRes = await fetch(`${baseUrl}/models`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (upstreamRes.ok) {
        const data: any = await upstreamRes.json();
        const activeModels = (data.data || [])
          .filter((m: any) => m.active !== false && !m.id.includes('whisper'))
          .map((m: any) => ({
            id: m.id,
            name: m.id.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
            provider: 'Groq Cloud',
            context_length: m.context_window || 8192,
            enabled: true,
            installed: true,
            metadata: {
              source: 'public_free',
              owned_by: m.owned_by,
            },
          }));
        if (activeModels.length > 0) {
          return res.status(200).json(activeModels);
        }
      }
    } catch {
      // Fall through to default models
    }
  }

  return res.status(200).json(PUBLIC_MODELS);
}
