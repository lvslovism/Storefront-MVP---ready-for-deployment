-- ============================================================
-- LINE Bot 會員綁定系統 - 資料庫 Schema
-- 版本: v1.0
-- 日期: 2026-02-07
-- 說明: 在 Supabase SQL Editor 執行此檔案建立所需資料表
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 1. customer_line_profiles（LINE 綁定表）
-- 用途：儲存 LINE 用戶與 Medusa 客戶的關聯關係
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS customer_line_profiles (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯 Medusa customer（可為 null，純 LINE OA 用戶尚未綁定時）
  customer_id UUID,

  -- LINE 用戶資料（核心欄位）
  -- line_user_id: LINE 平台提供的唯一用戶 ID，格式為 U + 32位英數字
  line_user_id VARCHAR(50) UNIQUE NOT NULL,
  -- display_name: LINE 顯示名稱
  display_name VARCHAR(255),
  -- picture_url: LINE 頭像 URL
  picture_url TEXT,

  -- 識別欄位（用於綁定和查詢）
  -- phone: 手機號碼，作為 Guest 訂單和 LINE 帳號之間的橋樑
  phone VARCHAR(20),
  -- email: Email，LINE Login 取得或結帳時填寫
  email VARCHAR(255),

  -- 時間戳記
  -- linked_at: 首次綁定時間
  linked_at TIMESTAMPTZ DEFAULT NOW(),
  -- last_active_at: 最後活動時間（每次互動更新）
  last_active_at TIMESTAMPTZ DEFAULT NOW(),

  -- 擴展欄位（儲存綁定來源、標籤等額外資料）
  metadata JSONB DEFAULT '{}'::jsonb
);

-- 欄位註解
COMMENT ON TABLE customer_line_profiles IS 'LINE 用戶綁定表，關聯 LINE 帳號與 Medusa 客戶';
COMMENT ON COLUMN customer_line_profiles.id IS '主鍵 UUID';
COMMENT ON COLUMN customer_line_profiles.customer_id IS '關聯 Medusa customer.id，可為 null';
COMMENT ON COLUMN customer_line_profiles.line_user_id IS 'LINE 用戶 ID，唯一必填，格式 Uxxxxxxxx';
COMMENT ON COLUMN customer_line_profiles.display_name IS 'LINE 顯示名稱';
COMMENT ON COLUMN customer_line_profiles.picture_url IS 'LINE 頭像 URL';
COMMENT ON COLUMN customer_line_profiles.phone IS '手機號碼（綁定用），格式 09xxxxxxxx';
COMMENT ON COLUMN customer_line_profiles.email IS 'Email（LINE Login 取得）';
COMMENT ON COLUMN customer_line_profiles.linked_at IS '首次綁定時間';
COMMENT ON COLUMN customer_line_profiles.last_active_at IS '最後活動時間';
COMMENT ON COLUMN customer_line_profiles.metadata IS '擴展資料 JSON，如 {"source": "line_oa", "tags": ["vip"]}';

-- 索引（加速查詢）
CREATE INDEX IF NOT EXISTS idx_line_profiles_customer_id ON customer_line_profiles(customer_id);
CREATE INDEX IF NOT EXISTS idx_line_profiles_phone ON customer_line_profiles(phone);
CREATE INDEX IF NOT EXISTS idx_line_profiles_email ON customer_line_profiles(email);
CREATE INDEX IF NOT EXISTS idx_line_profiles_last_active ON customer_line_profiles(last_active_at);


-- ────────────────────────────────────────────────────────────
-- 2. conversation_logs（對話紀錄表）
-- 用途：儲存所有 LINE 對話，作為 AI 訓練數據
-- ────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS conversation_logs (
  -- 主鍵
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 關聯欄位
  -- line_user_id: LINE 用戶 ID，必填
  line_user_id VARCHAR(50) NOT NULL,
  -- customer_id: 關聯 Medusa customer，未綁定用戶為 null
  customer_id UUID,

  -- 訊息內容
  -- message_type: 訊息類型 (text/image/sticker/postback/follow/unfollow)
  message_type VARCHAR(20) NOT NULL,
  -- user_message: 用戶發送的訊息內容
  user_message TEXT,
  -- bot_response: 機器人回覆的訊息內容
  bot_response TEXT,

  -- 意圖分析
  -- intent: 判斷的意圖類型 (order_query/binding/binding_phone/coupon/product_inquiry/greeting/unknown)
  intent VARCHAR(50),
  -- confidence: 意圖判斷信心度 (0.0 ~ 1.0)
  confidence FLOAT,

  -- 上下文資料（儲存訂單號、商品ID等）
  -- 範例: {"order_id": "order_01XXXX", "display_id": "1234", "source": "line_oa"}
  metadata JSONB DEFAULT '{}'::jsonb,

  -- 時間戳記
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 欄位註解
COMMENT ON TABLE conversation_logs IS 'LINE 對話紀錄表，用於分析和 AI 訓練';
COMMENT ON COLUMN conversation_logs.id IS '主鍵 UUID';
COMMENT ON COLUMN conversation_logs.line_user_id IS 'LINE 用戶 ID';
COMMENT ON COLUMN conversation_logs.customer_id IS '關聯 Medusa customer.id，未綁定為 null';
COMMENT ON COLUMN conversation_logs.message_type IS '訊息類型: text/image/sticker/postback/follow/unfollow';
COMMENT ON COLUMN conversation_logs.user_message IS '用戶發送的訊息';
COMMENT ON COLUMN conversation_logs.bot_response IS '機器人回覆的訊息';
COMMENT ON COLUMN conversation_logs.intent IS '意圖: order_query/binding/binding_phone/coupon/product_inquiry/greeting/unknown';
COMMENT ON COLUMN conversation_logs.confidence IS '意圖判斷信心度 0.0~1.0';
COMMENT ON COLUMN conversation_logs.metadata IS '上下文資料 JSON';
COMMENT ON COLUMN conversation_logs.created_at IS '建立時間';

-- 索引（加速查詢）
CREATE INDEX IF NOT EXISTS idx_conv_logs_line_user ON conversation_logs(line_user_id);
CREATE INDEX IF NOT EXISTS idx_conv_logs_customer ON conversation_logs(customer_id);
CREATE INDEX IF NOT EXISTS idx_conv_logs_intent ON conversation_logs(intent);
CREATE INDEX IF NOT EXISTS idx_conv_logs_created ON conversation_logs(created_at);
-- 複合索引：按用戶查最近對話
CREATE INDEX IF NOT EXISTS idx_conv_logs_user_created ON conversation_logs(line_user_id, created_at DESC);


-- ────────────────────────────────────────────────────────────
-- 3. Row Level Security (RLS) 設定
-- 說明：啟用 RLS，僅允許 service_role 存取（Edge Function 使用）
-- ────────────────────────────────────────────────────────────

-- customer_line_profiles RLS
ALTER TABLE customer_line_profiles ENABLE ROW LEVEL SECURITY;

-- 刪除既有 policy（如果存在）
DROP POLICY IF EXISTS "Service role full access" ON customer_line_profiles;

-- 建立 policy：僅 service_role 可完整存取
CREATE POLICY "Service role full access" ON customer_line_profiles
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- conversation_logs RLS
ALTER TABLE conversation_logs ENABLE ROW LEVEL SECURITY;

-- 刪除既有 policy（如果存在）
DROP POLICY IF EXISTS "Service role full access" ON conversation_logs;

-- 建立 policy：僅 service_role 可完整存取
CREATE POLICY "Service role full access" ON conversation_logs
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────
-- 4. 驗證
-- ────────────────────────────────────────────────────────────

-- 確認資料表已建立
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('customer_line_profiles', 'conversation_logs');

-- 確認 RLS 已啟用
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('customer_line_profiles', 'conversation_logs');
