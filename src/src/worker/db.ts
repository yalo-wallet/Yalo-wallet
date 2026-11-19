
export interface DatabaseResult<T> {
  success: boolean;
  data: T | null;
  error?: string;
}

export interface UserRecord {
  id: string;
  email: string;
  created_at: number;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  token_hash: string;
  expires_at: number;
  created_at: number;
}

export interface OtpRecord {
  id: string;
  email: string;
  code_hash: string;
  expires_at: number;
  attempts: number;
  created_at: number;
}

export interface AdminActivityRecord {
  id: string;
  type: string;
  description: string;
  status: string;
  created_at: number;
}

export interface AnnouncementRecord {
  id: string;
  title: string;
  message: string;
  type: string;
  active: number;
  created_at: number;
  updated_at: number;
}

export class YaloDatabase {
  constructor(private readonly db: D1Database) {}

  async createUser(
    email: string
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db.prepare(
      `INSERT INTO users (id, email, created_at)
       VALUES (?, ?, ?)`
    )
      .bind(id, email.toLowerCase(), now)
      .run();

    return id;
  }

  async getUserByEmail(
    email: string
  ): Promise<UserRecord | null> {
    return this.db.prepare(
      `SELECT id, email, created_at
       FROM users
       WHERE email = ?
       LIMIT 1`
    )
      .bind(email.toLowerCase())
      .first<UserRecord>();
  }

  async getUserById(
    id: string
  ): Promise<UserRecord | null> {
    return this.db.prepare(
      `SELECT id, email, created_at
       FROM users
       WHERE id = ?
       LIMIT 1`
    )
      .bind(id)
      .first<UserRecord>();
  }

  async createSession(
    userId: string,
    tokenHash: string,
    expiresAt: number
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db.prepare(
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
  }

  async getSession(
    tokenHash: string
  ): Promise<SessionRecord | null> {
    const now = Math.floor(Date.now() / 1000);

    return this.db.prepare(
      `SELECT id, user_id, token_hash, expires_at, created_at
       FROM sessions
       WHERE token_hash = ?
         AND expires_at > ?
       LIMIT 1`
    )
      .bind(tokenHash, now)
      .first<SessionRecord>();
  }

  async deleteSession(
    tokenHash: string
  ): Promise<void> {
    await this.db.prepare(
      `DELETE FROM sessions WHERE token_hash = ?`
    )
      .bind(tokenHash)
      .run();
  }

  async deleteExpiredSessions(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db.prepare(
      `DELETE FROM sessions WHERE expires_at <= ?`
    )
      .bind(now)
      .run();
  }

  async createOtp(
    email: string,
    codeHash: string,
    expiresAt: number
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db.prepare(
      `DELETE FROM otp_codes WHERE email = ?`
    )
      .bind(email.toLowerCase())
      .run();

    await this.db.prepare(
      `INSERT INTO otp_codes
       (id, email, code_hash, expires_at, attempts, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
      .bind(
        crypto.randomUUID(),
        email.toLowerCase(),
        codeHash,
        expiresAt,
        now
      )
      .run();
  }

  async getOtp(
    email: string
  ): Promise<OtpRecord | null> {
    return this.db.prepare(
      `SELECT id, email, code_hash, expires_at, attempts, created_at
       FROM otp_codes
       WHERE email = ?
       LIMIT 1`
    )
      .bind(email.toLowerCase())
      .first<OtpRecord>();
  }

  async incrementOtpAttempts(
    id: string
  ): Promise<void> {
    await this.db.prepare(
      `UPDATE otp_codes
       SET attempts = attempts + 1
       WHERE id = ?`
    )
      .bind(id)
      .run();
  }

  async deleteOtp(id: string): Promise<void> {
    await this.db.prepare(
      `DELETE FROM otp_codes WHERE id = ?`
    )
      .bind(id)
      .run();
  }

  async createAdminActivity(
    type: string,
    description: string,
    status = "success"
  ): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await this.db.prepare(
      `INSERT INTO admin_activity
       (id, type, description, status, created_at)
       VALUES (?, ?, ?, ?, ?)`
    )
      .bind(
        crypto.randomUUID(),
        type,
        description,
        status,
        now
      )
      .run();
  }

  async getRecentAdminActivity(
    limit = 50
  ): Promise<AdminActivityRecord[]> {
    const safeLimit = Math.max(
      1,
      Math.min(100, Math.floor(limit))
    );

    const result = await this.db.prepare(
      `SELECT id, type, description, status, created_at
       FROM admin_activity
       ORDER BY created_at DESC
       LIMIT ?`
    )
      .bind(safeLimit)
      .all<AdminActivityRecord>();

    return result.results ?? [];
  }

  async createAnnouncement(
    title: string,
    message: string,
    type: string
  ): Promise<string> {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);

    await this.db.prepare(
      `INSERT INTO announcements
       (id, title, message, type, active, created_at, updated_at)
       VALUES (?, ?, ?, ?, 1, ?, ?)`
    )
      .bind(id, title, message, type, now, now)
      .run();

    return id;
  }

  async getAnnouncements(): Promise<AnnouncementRecord[]> {
    const result = await this.db.prepare(
      `SELECT id, title, message, type, active,
              created_at, updated_at
       FROM announcements
       ORDER BY created_at DESC`
    )
      .all<AnnouncementRecord>();

    return result.results ?? [];
  }

  async deleteAnnouncement(id: string): Promise<void> {
    await this.db.prepare(
      `DELETE FROM announcements WHERE id = ?`
    )
      .bind(id)
      .run();
  }

  async cleanupExpiredData(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    await Promise.all([
      this.db.prepare(
        `DELETE FROM otp_codes WHERE expires_at <= ?`
      ).bind(now).run(),

      this.db.prepare(
        `DELETE FROM sessions WHERE expires_at <= ?`
      ).bind(now).run(),

      this.db.prepare(
        `DELETE FROM admin_sessions WHERE expires_at <= ?`
      ).bind(now).run(),

      this.db.prepare(
        `DELETE FROM admin_login_challenges WHERE expires_at <= ?`
      ).bind(now).run(),
    ]);
  }
}

export function createDatabase(
  binding: D1Database
): YaloDatabase {
  return new YaloDatabase(binding);
}
