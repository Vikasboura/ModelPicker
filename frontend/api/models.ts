export const PUBLIC_MODELS = [
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
      tier: 'Free Tier (30 RPM / 14.4k RPD)',
      speed: 'Up to 500+ tok/s',
    },
  },
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
      tier: 'Free Tier (30 RPM / 1,000 RPD)',
      speed: 'Up to 250+ tok/s',
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
      tier: 'Free Tier (30 RPM)',
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
      tier: 'Free Tier (30 RPM)',
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

  return res.status(200).json(PUBLIC_MODELS);
}
