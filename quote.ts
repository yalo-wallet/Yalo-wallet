type Env = {
  LIFI_API_KEY?: string;
};

type PagesContext = {
  request: Request;
  env: Env;
};

const ALLOWED_PARAMS = [
  'fromChain',
  'toChain',
  'fromToken',
  'toToken',
  'fromAmount',
  'fromAddress',
  'toAddress',
  'slippage',
] as const;

export async function onRequestGet({ request, env }: PagesContext): Promise<Response> {
  if (!env.LIFI_API_KEY) {
    return Response.json({ error: 'Swap service is not configured on the server.' }, { status: 503 });
  }

  const incoming = new URL(request.url);
  const params = new URLSearchParams();

  for (const key of ALLOWED_PARAMS) {
    const value = incoming.searchParams.get(key);
    if (value) params.set(key, value);
  }

  const required = ['fromChain', 'toChain', 'fromToken', 'toToken', 'fromAmount', 'fromAddress', 'toAddress'];
  const missing = required.filter((key) => !params.get(key));
  if (missing.length) {
    return Response.json({ error: `Missing quote parameters: ${missing.join(', ')}` }, { status: 400 });
  }

  if (!/^\\d+$/.test(params.get('fromAmount') || '')) {
    return Response.json({ error: 'Invalid token amount.' }, { status: 400 });
  }

  try {
    const upstream = await fetch(`https://li.quest/v1/quote?${params.toString()}`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'x-lifi-api-key': env.LIFI_API_KEY,
      },
    });

    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        'Content-Type': upstream.headers.get('Content-Type') || 'application/json',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json({ error: 'Unable to reach the swap quote service. Please try again.' }, { status: 502 });
  }
}
