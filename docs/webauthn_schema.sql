-- ============================================
-- WebAuthn / Passkey 資料表
-- 日期：2026-02-19
-- 前置：確認 public schema 可用
-- ============================================

-- 1. WebAuthn Credentials（存放公鑰）
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用戶關聯（polymorphic）
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'admin')),
  user_id VARCHAR(255) NOT NULL,
  
  -- WebAuthn 核心欄位
  credential_id TEXT NOT NULL UNIQUE,
  public_key BYTEA NOT NULL,
  counter BIGINT NOT NULL DEFAULT 0,
  
  -- 裝置資訊
  device_name VARCHAR(255),
  device_type VARCHAR(50),
  aaguid VARCHAR(36),
  transports JSONB DEFAULT '[]',
  
  -- RP 資訊
  rp_id VARCHAR(255) NOT NULL,
  
  -- 狀態
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_webauthn_user ON webauthn_credentials(user_type, user_id);
CREATE INDEX idx_webauthn_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_rp ON webauthn_credentials(rp_id);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE webauthn_credentials IS 'WebAuthn/Passkey 公鑰憑證';

-- 2. WebAuthn Challenges（暫存，TTL 5 分鐘）
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL UNIQUE,
  user_type VARCHAR(20),
  user_id VARCHAR(255),
  ceremony_type VARCHAR(20) NOT NULL CHECK (ceremony_type IN ('registration', 'authentication')),
  rp_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_challenge_lookup ON webauthn_challenges(challenge);
CREATE INDEX idx_challenge_expires ON webauthn_challenges(expires_at);

ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE webauthn_challenges IS 'WebAuthn Challenge 暫存（5 分鐘過期）';

-- 3. 自動清理過期 challenge（需要 pg_cron 擴展）
-- 如果 pg_cron 已啟用：
-- SELECT cron.schedule(
--   'clean-webauthn-challenges',
--   '*/10 * * * *',
--   $$DELETE FROM webauthn_challenges WHERE expires_at < NOW()$$
-- );

-- 手動清理指令（備用）：
-- DELETE FROM webauthn_challenges WHERE expires_at < NOW();
