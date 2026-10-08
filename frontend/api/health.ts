export default async function handler(req: any, res: any) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const hasApiKey = Boolean(process.env.PUBLIC_PROVIDER_API_KEY);
  const baseUrl = process.env.PUBLIC_PROVIDER_BASE_URL || 'https://api.groq.com/openai/v1';

  return res.status(200).json({
    status: 'healthy',
    mode: 'public_demo',
    provider: 'Groq / Public Free Cloud',
    provider_configured: hasApiKey,
    base_url: baseUrl,
    version: '1.0.0',
    timestamp: new Date().toISOString(),
  });
}
