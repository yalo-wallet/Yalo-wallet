
import type { Env } from "./index";

const SESSION_DURATION = 60 * 60 * 24 * 7;
const OTP_DURATION = 5 * 60;
const OTP_MAX_ATTEMPTS = 5;

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

function randomToken(length = 32): string {
  const bytes = crypto.getRandomValues(
    new Uint8Array(length)
  );

  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function sha256(value: string): Promise<string> {
  const data = new TextEncoder().encode(value);
  const hash = await crypto.subtle.digest("SHA-256", data);

  return Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getCookie(
  request: Request,
  name: string
): string | null {
  const cookie = request.headers.get("Cookie") || "";

  const entry = cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return entry
    ? decodeURIComponent(entry.substring(name.length + 1))
    : null;
}

function sessionCookie(
  token: string,
  maxAge: number
): string {
  return [
    `yalo_session=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

async function sendOtpEmail(
  env: Env,
  email: string,
  code: string
): Promise<void> {
  if (!env.EMAIL_API_KEY || !env.EMAIL_FROM) {
    throw new Error("Email service is not configured.");
  }

  const response = await fetch(
    "https://api.resend.com/emails",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.EMAIL_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.EMAIL_FROM,
        to: [email],
        subject: "Your YALO Wallet verification code",
        text: `Your YALO Wallet verification code is ${code}. It expires in 5 minutes. Do not share this code with anyone.`,
      }),
    }
  );

  if (!response.ok) {
    throw new Error("Unable to send verification email.");
  }
}

function validEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function createSession(
  env: Env,
  userId: string
): Promise<string> {
  const token = randomToken(32);
  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);
  const expiresAt = now + SESSION_DURATION;

  await env.DB.prepare(
    `INSERT INTO sessions
      (id, user_id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      userId,
      tokenHash,
      expiresAt,
      now
    )
    .run();

  return token;
}

export async function getAuthenticatedUser(
  request: Request,
  env: Env
): Promise<{ id: string; email: string } | null> {
  const token = getCookie(request, "yalo_session");

  if (!token) return null;

  const tokenHash = await sha256(token);
  const now = Math.floor(Date.now() / 1000);

  const result = await env.DB.prepare(
    `SELECT users.id, users.email
     FROM sessions
     INNER JOIN users ON users.id = sessions.user_id
     WHERE sessions.token_hash = ?
       AND sessions.expires_at > ?
     LIMIT 1`
  )
    .bind(tokenHash, now)
    .first<{ id: string; email: string }>();

  return result || null;
}

async function requestOtp(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<{
    email?: string;
  }>();

  const email = body.email?.trim().toLowerCase();

  if (!email || !validEmail(email)) {
    return json({ error: "Enter a valid email address." }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  const existing = await env.DB.prepare(
    `SELECT id, created_at
     FROM otp_codes
     WHERE email = ?
     ORDER BY created_at DESC
     LIMIT 1`
  )
    .bind(email)
    .first<{ id: string; created_at: number }>();

  if (existing && now - existing.created_at < 60) {
    return json(
      { error: "Please wait before requesting another code." },
      429
    );
  }

  const code = String(
    crypto.getRandomValues(new Uint32Array(1))[0] % 1000000
  ).padStart(6, "0");

  const codeHash = await sha256(`${email}:${code}`);

  await env.DB.prepare(
    `DELETE FROM otp_codes WHERE email = ?`
  )
    .bind(email)
    .run();

  await env.DB.prepare(
    `INSERT INTO otp_codes
      (id, email, code_hash, expires_at, attempts, created_at)
     VALUES (?, ?, ?, ?, 0, ?)`
  )
    .bind(
      crypto.randomUUID(),
      email,
      codeHash,
      now + OTP_DURATION,
      now
    )
    .run();

  try {
    await sendOtpEmail(env, email, code);
  } catch (error) {
    console.error("OTP email delivery failed:", error);

    await env.DB.prepare(
      `DELETE FROM otp_codes WHERE email = ?`
    )
      .bind(email)
      .run();

    return json(
      { error: "Unable to send the verification email." },
      503
    );
  }

  return json({
    success: true,
    message: "Verification code sent.",
  });
}

async function verifyOtp(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<{
    email?: string;
    code?: string;
  }>();

  const email = body.email?.trim().toLowerCase();
  const code = body.code?.trim();

  if (
    !email ||
    !validEmail(email) ||
    !code ||
    !/^\d{6}$/.test(code)
  ) {
    return json({ error: "Invalid verification details." }, 400);
  }

  const now = Math.floor(Date.now() / 1000);

  const record = await env.DB.prepare(
    `SELECT id, code_hash, expires_at, attempts
     FROM otp_codes
     WHERE email = ?
     LIMIT 1`
  )
    .bind(email)
    .first<{
      id: string;
      code_hash: string;
      expires_at: number;
      attempts: number;
    }>();

  if (!record) {
    return json({ error: "Invalid or expired code." }, 400);
  }

  if (
    record.expires_at <= now ||
    record.attempts >= OTP_MAX_ATTEMPTS
  ) {
    await env.DB.prepare(
      `DELETE FROM otp_codes WHERE id = ?`
    )
      .bind(record.id)
      .run();

    return json({ error: "Invalid or expired code." }, 400);
  }

  const suppliedHash = await sha256(`${email}:${code}`);

  if (suppliedHash !== record.code_hash) {
    await env.DB.prepare(
      `UPDATE otp_codes
       SET attempts = attempts + 1
       WHERE id = ?`
    )
      .bind(record.id)
      .run();

    return json({ error: "Invalid or expired code." }, 400);
  }

  await env.DB.prepare(
    `DELETE FROM otp_codes WHERE id = ?`
  )
    .bind(record.id)
    .run();

  let user = await env.DB.prepare(
    `SELECT id, email
     FROM users
     WHERE email = ?
     LIMIT 1`
  )
    .bind(email)
    .first<{ id: string; email: string }>();

  if (!user) {
    const userId = crypto.randomUUID();

    await env.DB.prepare(
      `INSERT INTO users (id, email, created_at)
       VALUES (?, ?, ?)`
    )
      .bind(userId, email, now)
      .run();

    user = {
      id: userId,
      email,
    };
  }

  const token = await createSession(env, user.id);

  return json(
    {
      success: true,
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
      },
    },
    200,
    {
      "Set-Cookie": sessionCookie(token, SESSION_DURATION),
    } as HeadersInit
  );
}

async function currentUser(
  request: Request,
  env: Env
): Promise<Response> {
  const user = await getAuthenticatedUser(request, env);

  if (!user) {
    return json({ authenticated: false }, 401);
  }

  return json({
    authenticated: true,
    user,
  });
}

async function logout(
  request: Request,
  env: Env
): Promise<Response> {
  const token = getCookie(request, "yalo_session");

  if (token) {
    const tokenHash = await sha256(token);

    await env.DB.prepare(
      `DELETE FROM sessions WHERE token_hash = ?`
    )
      .bind(tokenHash)
      .run();
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie:": "",
        "Set-Cookie": sessionCookie("", 0),
      },
    }
  );
}

export async function handleAuthRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const path = new URL(request.url).pathname;

  try {
    if (
      path === "/api/auth/request-otp" &&
      request.method === "POST"
    ) {
      return await requestOtp(request, env);
    }

    if (
      path === "/api/auth/verify-otp" &&
      request.method === "POST"
    ) {
      return await verifyOtp(request, env);
    }

    if (
      path === "/api/auth/me" &&
      request.method === "GET"
    ) {
      return await currentUser(request, env);
    }

    if (
      path === "/api/auth/logout" &&
      request.method === "POST"
    ) {
      return await logout(request, env);
    }

    return json({ error: "Authentication endpoint not found." }, 404);
  } catch (error) {
    console.error("Authentication error:", error);

    return json(
      { error: "Authentication service temporarily unavailable." },
      500
    );
  }
}
