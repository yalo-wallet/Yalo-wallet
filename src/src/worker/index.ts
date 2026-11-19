
import {
  handleAuthRequest,
} from "./auth";

import {
  handleAdminRequest,
  handleApiRequest,
} from "./admin";

export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;

  APP_ORIGIN?: string;

  SESSION_SECRET: string;
  ADMIN_EMAIL: string;
  ADMIN_PASSWORD_HASH: string;

  EMAIL_API_KEY?: string;
  EMAIL_FROM?: string;

  ETHEREUM_RPC_URL?: string;
  BASE_RPC_URL?: string;
  SOLANA_RPC_URL?: string;

  LIFI_API_KEY?: string;
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
};

function jsonResponse(
  data: unknown,
  status = 200,
  extraHeaders: HeadersInit = {}
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      ...SECURITY_HEADERS,
      ...extraHeaders,
    },
  });
}

function isAllowedOrigin(
  request: Request,
  env: Env
): boolean {
  const origin = request.headers.get("Origin");

  if (!origin) return true;

  if (!env.APP_ORIGIN) return false;

  return origin === env.APP_ORIGIN;
}

function getCorsHeaders(
  request: Request,
  env: Env
): HeadersInit {
  const origin = request.headers.get("Origin");

  if (!origin || !isAllowedOrigin(request, env)) {
    return {};
  }

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Vary": "Origin",
  };
}

async function handleRequest(
  request: Request,
  env: Env,
  ctx: ExecutionContext
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  if (request.method === "OPTIONS") {
    if (!isAllowedOrigin(request, env)) {
      return jsonResponse(
        { error: "Origin not allowed" },
        403
      );
    }

    return new Response(null, {
      status: 204,
      headers: {
        ...SECURITY_HEADERS,
        ...getCorsHeaders(request, env),
      },
    });
  }

  if (!isAllowedOrigin(request, env)) {
    return jsonResponse(
      { error: "Origin not allowed" },
      403
    );
  }

  if (path === "/api/health" && request.method === "GET") {
    return jsonResponse({
      success: true,
      service: "YALO Wallet API",
      status: "online",
    });
  }

  let response: Response;

  try {
    if (path.startsWith("/api/auth/")) {
      response = await handleAuthRequest(
        request,
        env
      );
    } else if (path.startsWith("/api/admin/")) {
      response = await handleAdminRequest(
        request,
        env
      );
    } else if (path.startsWith("/api/")) {
      response = await handleApiRequest(
        request,
        env
      );
    } else {
      response = await env.ASSETS.fetch(request);
    }
  } catch (error) {
    console.error("YALO API error:", error);

    response = jsonResponse(
      { error: "An internal server error occurred." },
      500
    );
  }

  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(
    SECURITY_HEADERS
  )) {
    headers.set(key, value);
  }

  for (const [key, value] of Object.entries(
    getCorsHeaders(request, env)
  )) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    return handleRequest(request, env, ctx);
  },
};
