interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  LIFI_API_KEY?: string;
}

async function handleQuote(request: Request, env: Env): Promise<Response> {
  try {
    if (!env.LIFI_API_KEY) {
      return Response.json({ error: 'LI.FI API key is not configured.' }, { status: 500 });
    }
    const body = await request.json() as Record<string, unknown>;
    const required = ['fromChain', 'toChain', 'fromToken', 'toToken', 'fromAmount', 'fromAddress'];
    for (const field of required) {
      if (typeof body[field] !== 'string' || !body[field]) {
        return Response.json({ error: `Missing or invalid field: ${field}` }, { status: 400 });
      }
    }
    if (!/^\d+$/.test(body.fromAmount as string) || BigInt(body.fromAmount as string) <= BigInt(0)) {
      return Response.json({ error: 'Invalid transaction amount.' }, { status: 400 });
    }
    const params = new URLSearchParams();
    for (const field of required) params.set(field, body[field] as string);
    if (body.slippage !== undefined) params.set('slippage', String(body.slippage));

    const upstream = await fetch(`https://li.quest/v1/quote?${params.toString()}`, {
      method: 'GET',
      headers: { accept: 'application/json', 'x-lifi-api-key': env.LIFI_API_KEY },
    });
    const raw = await upstream.text();
    let result: unknown;
    try {
      result = raw ? JSON.parse(raw) : null;
    } catch {
      return Response.json({ error: `LI.FI ya dawo da amsa mara kyau (HTTP ${upstream.status}): ${raw.slice(0, 200)}` }, { status: 502 });
    }
    if (result === null) {
      return Response.json({ error: `LI.FI ya dawo da amsa fanko (HTTP ${upstream.status}).` }, { status: 502 });
    }
    return Response.json(result, { status: upstream.status });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to retrieve LI.FI quote.' }, { status: 500 });
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/lifi/quote') {
      if (request.method !== 'POST') {
        return Response.json({ error: 'Method not allowed. Use POST.' }, { status: 405, headers: { Allow: 'POST' } });
      }
      return handleQuote(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
                                                                                                                 
