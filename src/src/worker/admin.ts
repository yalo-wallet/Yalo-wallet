
import type { Env } from "./index";
import { getAuthenticatedUser } from "./auth";

const ADMIN_SESSION_DURATION = 60 * 60 * 8;
const ADMIN_2FA_DURATION = 5 * 60;

type AdminSession = {
  id: string;
  token_hash: string;
  expires_at: number;
};

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

async function hash(value: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value)
  );

  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function getCookie(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") || "";

  const entry = cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${name}=`));

  return entry
    ? decodeURIComponent(entry.substring(name.length + 1))
    : null;
}

function adminCookie(token: string, maxAge: number): string {
  return [
    `yalo_admin_session=${encodeURIComponent(token)}`,
    "HttpOnly",
    "Secure",
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${maxAge}`,
  ].join("; ");
}

async function verifyPassword(
  password: string,
  storedHash: string
): Promise<boolean> {
  // Expected format: pbkdf2$iterations$salt$hash
  const parts = storedHash.split("$");

  if (
    parts.length !== 4 ||
    parts[0] !== "pbkdf2"
  ) {
    return false;
  }

  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expected = parts[3];

  if (
    !Number.isSafeInteger(iterations) ||
    iterations < 100000 ||
    iterations > 1000000 ||
    !salt ||
    !expected
  ) {
    return false;
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: new TextEncoder().encode(salt),
      iterations,
      hash: "SHA-256",
    },
    key,
    256
  );

  const actual = Array.from(new Uint8Array(derived))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");

  if (actual.length !== expected.length) return false;

  let difference = 0;

  for (let i = 0; i < actual.length; i++) {
    difference |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  }

  return difference === 0;
}

async function createAdminSession(
  env: Env
): Promise<string> {
  const token = randomToken();
  const tokenHash = await hash(token);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO admin_sessions
      (id, token_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      tokenHash,
      now + ADMIN_SESSION_DURATION,
      now
    )
    .run();

  return token;
}

async function requireAdmin(
  request: Request,
  env: Env
): Promise<AdminSession | null> {
  const token = getCookie(request, "yalo_admin_session");

  if (!token) return null;

  const tokenHash = await hash(token);
  const now = Math.floor(Date.now() / 1000);

  return env.DB.prepare(
    `SELECT id, token_hash, expires_at
     FROM admin_sessions
     WHERE token_hash = ?
       AND expires_at > ?
     LIMIT 1`
  )
    .bind(tokenHash, now)
    .first<AdminSession>();
}

async function adminLogin(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<{
    email?: string;
    password?: string;
  }>();

  const email = body.email?.trim().toLowerCase();
  const password = body.password;

  if (
    !email ||
    !password ||
    !env.ADMIN_EMAIL ||
    !env.ADMIN_PASSWORD_HASH
  ) {
    return json({ error: "Invalid login details." }, 401);
  }

  if (email !== env.ADMIN_EMAIL.trim().toLowerCase()) {
    return json({ error: "Invalid login details." }, 401);
  }

  const valid = await verifyPassword(
    password,
    env.ADMIN_PASSWORD_HASH
  );

  if (!valid) {
    return json({ error: "Invalid login details." }, 401);
  }

  // Two-factor authentication must be enrolled and verified
  // before an administrator session can be created.
  const admin = await env.DB.prepare(
    `SELECT id, totp_secret_encrypted
     FROM admin_accounts
     WHERE email = ?
       AND two_factor_enabled = 1
     LIMIT 1`
  )
    .bind(email)
    .first<{
      id: string;
      totp_secret_encrypted: string;
    }>();

  if (!admin?.totp_secret_encrypted) {
    return json(
      {
        error: "Administrator two-factor authentication is not configured.",
      },
      403
    );
  }

  const challenge = randomToken();

  const challengeHash = await hash(challenge);
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO admin_login_challenges
      (id, admin_id, challenge_hash, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?)`
  )
    .bind(
      crypto.randomUUID(),
      admin.id,
      challengeHash,
      now + ADMIN_2FA_DURATION,
      now
    )
    .run();

  return json({
    requiresTwoFactor: true,
    challenge,
  });
}

async function verifyAdminTwoFactor(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<{
    challenge?: string;
    code?: string;
  }>();

  if (
    !body.challenge ||
    !body.code ||
    !/^\d{6}$/.test(body.code)
  ) {
    return json({ error: "Invalid verification details." }, 400);
  }

  const challengeHash = await hash(body.challenge);
  const now = Math.floor(Date.now() / 1000);

  const challenge = await env.DB.prepare(
    `SELECT id, admin_id, expires_at
     FROM admin_login_challenges
     WHERE challenge_hash = ?
       AND expires_at > ?
     LIMIT 1`
  )
    .bind(challengeHash, now)
    .first<{
      id: string;
      admin_id: string;
      expires_at: number;
    }>();

  if (!challenge) {
    return json({ error: "Invalid or expired challenge." }, 401);
  }

  // TOTP verification is implemented in the database/security
  // layer before production activation.
  const verified = await verifyAdminTotp(
    env,
    challenge.admin_id,
    body.code
  );

  if (!verified) {
    return json({ error: "Invalid verification code." }, 401);
  }

  await env.DB.prepare(
    `DELETE FROM admin_login_challenges WHERE id = ?`
  )
    .bind(challenge.id)
    .run();

  const token = await createAdminSession(env);

  return new Response(
    JSON.stringify({ authenticated: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": adminCookie(
          token,
          ADMIN_SESSION_DURATION
        ),
      },
    }
  );
}

async function verifyAdminTotp(
  env: Env,
  adminId: string,
  code: string
): Promise<boolean> {
  const record = await env.DB.prepare(
    `SELECT totp_secret_encrypted
     FROM admin_accounts
     WHERE id = ?
     LIMIT 1`
  )
    .bind(adminId)
    .first<{ totp_secret_encrypted: string }>();

  if (!record?.totp_secret_encrypted) return false;

  // A real TOTP implementation and encrypted-secret
  // decryption will be connected before enabling admin login.
  return false;
}

async function adminLogout(
  request: Request,
  env: Env
): Promise<Response> {
  const token = getCookie(request, "yalo_admin_session");

  if (token) {
    await env.DB.prepare(
      `DELETE FROM admin_sessions WHERE token_hash = ?`
    )
      .bind(await hash(token))
      .run();
  }

  return new Response(
    JSON.stringify({ success: true }),
    {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
        "Set-Cookie": adminCookie("", 0),
      },
    }
  );
}

async function getStats(env: Env): Promise<Response> {
  const [users, transactions, swaps, revenue, active] =
    await Promise.all([
      env.DB.prepare(
        "SELECT COUNT(*) AS total FROM users"
      ).first<{ total: number }>(),

      env.DB.prepare(
        "SELECT COUNT(*) AS total FROM transactions"
      ).first<{ total: number }>(),

      env.DB.prepare(
        "SELECT COUNT(*) AS total FROM swaps"
      ).first<{ total: number }>(),

      env.DB.prepare(
        "SELECT COALESCE(SUM(amount_usd), 0) AS total FROM platform_revenue"
      ).first<{ total: number }>(),

      env.DB.prepare(
        `SELECT COUNT(DISTINCT user_id) AS total
         FROM sessions
         WHERE expires_at > ?`
      )
        .bind(Math.floor(Date.now() / 1000))
        .first<{ total: number }>(),
    ]);

  return json({
    totalUsers: users?.total ?? 0,
    totalTransactions: transactions?.total ?? 0,
    totalSwaps: swaps?.total ?? 0,
    totalRevenueUsd: revenue?.total ?? 0,
    activeUsers: active?.total ?? 0,
  });
}

async function getActivity(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, type, description, status, created_at AS createdAt
     FROM admin_activity_view
     ORDER BY created_at DESC
     LIMIT 50`
  ).all();

  return json(result.results ?? []);
}

async function getAnnouncements(env: Env): Promise<Response> {
  const result = await env.DB.prepare(
    `SELECT id, title, message, type, active
     FROM announcements
     ORDER BY created_at DESC`
  ).all();

  return json(result.results ?? []);
}

async function createAnnouncement(
  request: Request,
  env: Env
): Promise<Response> {
  const body = await request.json<{
    title?: string;
    message?: string;
    type?: string;
    active?: boolean;
  }>();

  const title = body.title?.trim();
  const message = body.message?.trim();

  const allowedTypes = [
    "info",
    "success",
    "warning",
    "promotion",
  ];

  if (
    !title ||
    title.length > 100 ||
    !message ||
    message.length > 1000 ||
    !body.type ||
    !allowedTypes.includes(body.type)
  ) {
    return json({ error: "Invalid announcement details." }, 400);
  }

  const id = crypto.randomUUID();
  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO announcements
      (id, title, message, type, active, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  )
    .bind(
      id,
      title,
      message,
      body.type,
      body.active === false ? 0 : 1,
      now,
      now
    )
    .run();

  return json({ success: true, id }, 201);
}

async function updateAnnouncement(
  request: Request,
  env: Env,
  id: string
): Promise<Response> {
  const body = await request.json<{
    active?: boolean;
    title?: string;
    message?: string;
    type?: string;
  }>();

  const existing = await env.DB.prepare(
    "SELECT id FROM announcements WHERE id = ?"
  )
    .bind(id)
    .first();

  if (!existing) {
    return json({ error: "Announcement not found." }, 404);
  }

  const allowedTypes = [
    "info",
    "success",
    "warning",
    "promotion",
  ];

  if (
    body.title !== undefined &&
    (!body.title.trim() || body.title.length > 100)
  ) {
    return json({ error: "Invalid title." }, 400);
  }

  if (
    body.message !== undefined &&
    (!body.message.trim() || body.message.length > 1000)
  ) {
    return json({ error: "Invalid message." }, 400);
  }

  if (
    body.type !== undefined &&
    !allowedTypes.includes(body.type)
  ) {
    return json({ error: "Invalid announcement type." }, 400);
  }

  await env.DB.prepare(
    `UPDATE announcements
     SET title = COALESCE(?, title),
         message = COALESCE(?, message),
         type = COALESCE(?, type),
         active = COALESCE(?, active),
         updated_at = ?
     WHERE id = ?`
  )
    .bind(
      body.title?.trim() ?? null,
      body.message?.trim() ?? null,
      body.type ?? null,
      body.active === undefined ? null : body.active ? 1 : 0,
      Math.floor(Date.now() / 1000),
      id
    )
    .run();

  return json({ success: true });
}

async function deleteAnnouncement(
  env: Env,
  id: string
): Promise<Response> {
  await env.DB.prepare(
    "DELETE FROM announcements WHERE id = ?"
  )
    .bind(id)
    .run();

  return json({ success: true });
}

export async function handleAdminRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const path = new URL(request.url).pathname;
  const method = request.method;

  try {
    if (
      path === "/api/admin/auth/login" &&
      method === "POST"
    ) {
      return await adminLogin(request, env);
    }

    if (
      path === "/api/admin/auth/verify" &&
      method === "POST"
    ) {
      return await verifyAdminTwoFactor(request, env);
    }

    if (
      path === "/api/admin/auth/logout" &&
      method === "POST"
    ) {
      return await adminLogout(request, env);
    }

    const admin = await requireAdmin(request, env);

    if (!admin) {
      return json({ error: "Admin authentication required." }, 401);
    }

    if (
      path === "/api/admin/dashboard/stats" &&
      method === "GET"
    ) {
      return await getStats(env);
    }

    if (
      path === "/api/admin/dashboard/activity" &&
      method === "GET"
    ) {
      return await getActivity(env);
    }

    if (
      path === "/api/admin/announcements" &&
      method === "GET"
    ) {
      return await getAnnouncements(env);
    }

    if (
      path === "/api/admin/announcements" &&
      method === "POST"
    ) {
      return await createAnnouncement(request, env);
    }

    const announcementMatch = path.match(
      /^\/api\/admin\/announcements\/([a-zA-Z0-9-]+)$/
    );

    if (announcementMatch) {
      const id = announcementMatch[1];

      if (method === "PUT" || method === "PATCH") {
        return await updateAnnouncement(request, env, id);
      }

      if (method === "DELETE") {
        return await deleteAnnouncement(env, id);
      }
    }

    return json({ error: "Admin endpoint not found." }, 404);
  } catch (error) {
    console.error("Admin API error:", error);

    return json(
      { error: "Admin service temporarily unavailable." },
      500
    );
  }
}

export async function handleApiRequest(
  request: Request,
  env: Env
): Promise<Response> {
  const path = new URL(request.url).pathname;

  const user = await getAuthenticatedUser(request, env);

  if (!user) {
    return json({ error: "Authentication required." }, 401);
  }

  if (
    path === "/api/wallet" &&
    request.method === "GET"
  ) {
    return json({
      error: "Wallet data service is not implemented yet.",
    }, 501);
  }

  if (
    path === "/api/wallet/addresses" &&
    request.method === "GET"
  ) {
    return json({
      ethereum: null,
      base: null,
      solana: null,
    });
  }

  if (
    path === "/api/transactions" &&
    request.method === "GET"
  ) {
    return json([]);
  }

  return json({ error: "API endpoint not found." }, 404);
}
