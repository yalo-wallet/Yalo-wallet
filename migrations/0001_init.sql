
PRAGMA foreign_keys = ON;

-- ==============================
-- USERS
-- ==============================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'suspended', 'deleted')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE INDEX IF NOT EXISTS idx_users_created_at
ON users(created_at);


-- ==============================
-- EMAIL OTP
-- ==============================

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_otp_email
ON otp_codes(email);

CREATE INDEX IF NOT EXISTS idx_otp_expiry
ON otp_codes(expires_at);


-- ==============================
-- USER SESSIONS
-- ==============================

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON sessions(user_id);

CREATE INDEX IF NOT EXISTS idx_sessions_expiry
ON sessions(expires_at);


-- ==============================
-- ADMIN ACCOUNTS
-- ==============================

CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  totp_secret_encrypted TEXT,
  two_factor_enabled INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'disabled')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_login_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_admin_email
ON admin_accounts(email);


-- ==============================
-- ADMIN SESSIONS
-- ==============================

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at TEXT,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin
ON admin_sessions(admin_id);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_expiry
ON admin_sessions(expires_at);


-- ==============================
-- ADMIN LOGIN CHALLENGES
-- ==============================

CREATE TABLE IF NOT EXISTS admin_login_challenges (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  challenge_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_admin_challenges_expiry
ON admin_login_challenges(expires_at);


-- ==============================
-- WALLET ADDRESSES
-- ==============================

CREATE TABLE IF NOT EXISTS wallet_addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  network TEXT NOT NULL
    CHECK (network IN ('ethereum', 'base', 'solana')),
  address TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(user_id, network, address),
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_wallet_addresses_user
ON wallet_addresses(user_id);


-- ==============================
-- TRANSACTIONS
-- ==============================

CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  network TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  transaction_type TEXT NOT NULL,
  from_address TEXT,
  to_address TEXT,
  asset_symbol TEXT,
  amount TEXT,
  fee TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  block_number TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(network, tx_hash),
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_transactions_user
ON transactions(user_id);

CREATE INDEX IF NOT EXISTS idx_transactions_status
ON transactions(status);

CREATE INDEX IF NOT EXISTS idx_transactions_created
ON transactions(created_at);


-- ==============================
-- SWAPS
-- ==============================

CREATE TABLE IF NOT EXISTS swaps (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  from_network TEXT NOT NULL,
  to_network TEXT NOT NULL,
  from_token TEXT NOT NULL,
  to_token TEXT NOT NULL,
  from_amount TEXT NOT NULL,
  to_amount TEXT,
  tx_hash TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  fee_amount TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_swaps_user
ON swaps(user_id);

CREATE INDEX IF NOT EXISTS idx_swaps_status
ON swaps(status);


-- ==============================
-- PLATFORM REVENUE
-- ==============================

CREATE TABLE IF NOT EXISTS platform_revenue (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  transaction_id TEXT,
  network TEXT,
  revenue_type TEXT NOT NULL,
  amount TEXT NOT NULL,
  currency TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_revenue_created
ON platform_revenue(created_at);


-- ==============================
-- ANNOUNCEMENTS
-- ==============================

CREATE TABLE IF NOT EXISTS announcements (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info'
    CHECK (type IN ('info', 'success', 'warning', 'promotion')),
  active INTEGER NOT NULL DEFAULT 1,
  starts_at TEXT,
  ends_at TEXT,
  created_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_announcements_active
ON announcements(active);

CREATE INDEX IF NOT EXISTS idx_announcements_dates
ON announcements(starts_at, ends_at);


-- ==============================
-- ADMIN ACTIVITY
-- ==============================

CREATE TABLE IF NOT EXISTS admin_activity (
  id TEXT PRIMARY KEY,
  admin_id TEXT,
  action TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_admin_activity_created
ON admin_activity(created_at);

CREATE INDEX IF NOT EXISTS idx_admin_activity_admin
ON admin_activity(admin_id);


-- ==============================
-- ADMIN ACTIVITY VIEW
-- ==============================

CREATE VIEW IF NOT EXISTS admin_activity_view AS
SELECT
  id,
  admin_id,
  action,
  description,
  ip_address,
  user_agent,
  created_at
FROM admin_activity;


-- ==============================
-- SECURITY EVENTS
-- ==============================

CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  event_type TEXT NOT NULL,
  description TEXT,
  ip_address TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_security_events_created
ON security_events(created_at);

CREATE INDEX IF NOT EXISTS idx_security_events_user
ON security_events(user_id);


-- ==============================
-- CLEANUP SUPPORT
-- ==============================

CREATE INDEX IF NOT EXISTS idx_otp_cleanup
ON otp_codes(expires_at);

CREATE INDEX IF NOT EXISTS idx_session_cleanup
ON sessions(expires_at);

CREATE INDEX IF NOT EXISTS idx_admin_challenge_cleanup
ON admin_login_challenges(expires_at);
