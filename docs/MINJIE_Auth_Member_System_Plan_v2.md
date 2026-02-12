# MINJIE STUDIO — 會員認證系統完整規劃 v2

> 版本：v2.0（整合安全技術文件後更新）  
> 日期：2026-02-12  
> 前版：v1.0（2026-02-11）  
> 狀態：規劃中（待技術長簽核）  
> 涉及角色：技術長（架構決策）、前端工程師（UI 實作）、後端工程師（API/Session）、UX 設計師（流程設計）  
> 依賴文件：`MINJIE_Auth_Security_Technical_Guide_v1_0.docx`、`System_Connection_Map`、`page-layout.json`

---

## 🆕 v2 更新摘要

v1 規劃時有多項「資訊缺口」，在取得 `Auth_Security_Technical_Guide_v1_0` 後已全部解決。以下為 v1 → v2 的關鍵差異：

| 項目 | v1（舊） | v2（更新後） | 影響 |
|------|---------|-------------|------|
| LINE 登入方式 | 描述為「OAuth 2.0 redirect」 | 確認為 **LIFF SDK**（`liff.login()`） | 前端登入按鈕的實作方式不同 |
| Session 儲存 | 列為「待確認資訊缺口」 | 確認為 **Session Cookie** | 決策 1 已確認為選項 A |
| 會員資料表 | 規劃新建 `members` + `member_points` | 已存在 `customer_line_profiles` + `member_wallet` + `member_tier` + `wallet_transaction` + `tier_config` | **不需建新表**，改用現有 schema |
| Email 登入 | 建議「暫不加」 | 決定 **保留 Email 登入 + 信箱驗證**（OTP） | 需新建 Email 認證相關表和 API |
| RLS 規則 | 僅列為「安全審核」待辦 | 已有完整 RLS policy（service_role / authenticated） | 已有基礎，Email 認證需補充 |
| 後台認證 | 未涉及 | 已有五層防禦架構文件 | 不影響前台開發，但需知曉 |
| 環境變數 | 未列出 | 完整列出 Storefront / CMS / Edge Function | 開發時可直接參考 |

---

## 一、現狀診斷（已更新）

### 目前有什麼

根據 `Auth_Security_Technical_Guide_v1_0` 確認的現有架構：

| 項目 | 現況 | 狀態 |
|------|------|:----:|
| 登入方式 | LINE Login via **LIFF SDK**（`liff.login()`） | ✅ 已有 |
| 登入流程 | LIFF → `/auth/line/callback` → 查 `customer_line_profiles` → upsert Medusa Customer → 設 Session Cookie | ✅ 已有 |
| Session 管理 | **Session Cookie**（由 `/auth/line/callback` 設定） | ✅ 已有 |
| Session 檢查 | `/api/auth/line/session` API | ✅ 已有 |
| 會員綁定表 | `customer_line_profiles`（Supabase） | ✅ 已有 |
| 購物金系統 | `member_wallet` + `wallet_transaction`（Supabase） | ✅ 已有 |
| 會員等級系統 | `member_tier` + `tier_config`（4 級：normal/silver/gold/vip） | ✅ 已有 |
| RLS 規則 | `customer_line_profiles` = service_role only；`member_wallet` / `wallet_transaction` = 用戶只看自己 | ✅ 已有 |
| LIFF 設定 | App name: MINJIE STUDIO Login / Full size / Scope: profile, openid, email | ✅ 已有 |
| 登出 API | **不存在** | ❌ 缺漏 |
| 獨立登入頁 | **不存在** | ❌ 缺漏 |
| 會員中心頁面 | **不存在**（僅 `page-layout.json` 規劃） | ❌ 缺漏 |
| Email/密碼登入 | **不存在** | ❌ 缺漏（本版納入） |

### 核心問題清單（不變）

1. **無法登出** — 最急迫，涉及隱私和帳號安全
2. **無獨立登入頁** — 缺少明確的登入導引
3. **無會員中心頁面** — 4 Tab 規劃未實作
4. **只有 LINE 登入** — 本版決定加入 Email/密碼 + 信箱驗證

---

## 二、架構決策（已確認 ✅）

### 決策 1：Session 儲存方式 → ✅ 確認選項 A

**已由安全文件確認**：LINE Login callback 後透過 Session Cookie 儲存。登出只需清除此 cookie。

### 決策 2：Email 登入 → ✅ 決定加入（含信箱驗證）

**更新原因**：業務決定保留 Email/密碼登入作為 LINE 的替代方案，但要求必須做信箱驗證（OTP），避免使用者填錯信箱。

**實作方案**：自建 Email 認證系統（不走 Supabase Auth，維持現有架構一致性），需新建以下 Supabase 表：

```sql
-- Email 認證用戶表
CREATE TABLE email_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,                       -- Medusa Customer ID（驗證通過後建立）
  merchant_code VARCHAR(50) DEFAULT 'minjie',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,     -- bcrypt hash
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_users_email ON email_users(email);
CREATE INDEX idx_email_users_customer ON email_users(customer_id);

-- Email 驗證碼表
CREATE TABLE email_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,               -- 6 位數字驗證碼
  purpose VARCHAR(20) NOT NULL,           -- register / reset_password
  attempts INTEGER DEFAULT 0,             -- 嘗試次數（防暴力破解）
  max_attempts INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,        -- 建立後 10 分鐘
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verify_email ON email_verification_codes(email, purpose);

-- RLS 規則
ALTER TABLE email_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON email_users
  FOR ALL USING (auth.role() = 'service_role');

ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON email_verification_codes
  FOR ALL USING (auth.role() = 'service_role');
```

**帳號合併邏輯**：同一個人可能先用 LINE 登入、後來又用 Email 註冊，合併依據為 email 欄位。若 `customer_line_profiles.email` 與 `email_users.email` 相同，兩者共用同一個 `customer_id`（Medusa Customer）。

### 決策 3：會員資料儲存 → ✅ 確認選項 C（已有現成表）

**已由安全文件確認**：不需要新建 `members` 表（v1 的 schema 作廢）。現有架構為：

| 資料 | 儲存位置 | 說明 |
|------|---------|------|
| 訂單、付款、商品 | **Medusa** Customer + Order | 電商核心資料 |
| LINE 綁定資料 | **Supabase** `customer_line_profiles` | LINE 登入時 upsert |
| Email 登入資料 | **Supabase** `email_users`（新建） | Email 註冊時建立 |
| 購物金 | **Supabase** `member_wallet` + `wallet_transaction` | 已有，餘額 + 明細 |
| 會員等級 | **Supabase** `member_tier` + `tier_config` | 已有，4 級 + 設定 |

---

## 三、現有資料表 Schema 參考（來自安全文件）

> ⚠️ 以下為安全文件中記載的**現有表結構**，工程師開發時請以此為準，不要使用 v1 規劃的 `members` / `member_points` schema。

### 3.1 customer_line_profiles（LINE 綁定）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | 主鍵 |
| customer_id | UUID NOT NULL | Medusa Customer ID |
| line_user_id | VARCHAR(50) UNIQUE | LINE User ID |
| display_name | VARCHAR(255) | LINE 顯示名稱 |
| picture_url | TEXT | LINE 頭像 URL |
| status_message | TEXT | LINE 狀態訊息 |
| email | VARCHAR(255) | LINE 取得的 Email |
| phone | VARCHAR(20) | 手機號碼 |
| merchant_code | VARCHAR(50) | 商家代碼 |
| linked_at | TIMESTAMPTZ | 首次綁定時間 |
| last_active_at | TIMESTAMPTZ | 最後活躍時間 |

**RLS**：僅 `service_role` 可存取（前端必須透過 API Route 中繼）

### 3.2 member_wallet（購物金錢包）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | 主鍵 |
| customer_id | VARCHAR(255) UNIQUE | Medusa Customer ID |
| merchant_code | VARCHAR(50) | 商家代碼 |
| balance | DECIMAL(10,2) CHECK >= 0 | 目前餘額 |
| total_earned | DECIMAL(12,2) | 累計獲得 |
| total_spent | DECIMAL(12,2) | 累計使用 |

**RLS**：`authenticated` 角色只能看自己的（`auth.uid()::text = user_id`）

### 3.3 wallet_transaction（購物金明細）

**RLS**：`authenticated` 角色只能看自己 wallet 的交易

### 3.4 member_tier（會員等級）

| 欄位 | 型別 | 說明 |
|------|------|------|
| id | UUID PK | 主鍵 |
| customer_id | VARCHAR(255) UNIQUE | Medusa Customer ID |
| merchant_code | VARCHAR(50) | 商家代碼 |
| tier_level | VARCHAR(50) | normal / silver / gold / vip |
| tier_points | INTEGER | 目前積點 |
| total_orders | INTEGER | 累計訂單數 |
| total_spent | DECIMAL(12,2) | 累計消費金額 |
| discount_rate | DECIMAL(5,4) | 折扣率 |
| upgraded_at | TIMESTAMPTZ | 最近升等時間 |
| expires_at | TIMESTAMPTZ | 等級有效期限 |

### 3.5 tier_config（等級設定）

| 欄位 | 型別 | 說明 |
|------|------|------|
| tier_level | VARCHAR(50) | 等級代碼 |
| tier_name | VARCHAR(100) | 顯示名稱 |
| min_spent | DECIMAL(12,2) | 升等門檻金額 |
| points_multiplier | DECIMAL(3,2) | 積點倍率 |
| birthday_points | INT | 生日禮金點數 |
| monthly_credits | DECIMAL(10,2) | 每月購物金配額 |

現有 4 筆：normal / silver / gold / vip，merchant_code = 'minjie'

### 3.6 會員面板資料存取對照

| 會員中心 Tab | 資料來源 | API / 查詢方式 |
|-------------|---------|---------------|
| 訂單歷史 | Medusa Order（透過 customer_id） | `GET /store/orders`（帶 JWT） |
| 會員等級 | Supabase `member_tier` | `WHERE customer_id = 自己` |
| 購物金餘額 | Supabase `member_wallet` | `WHERE customer_id = 自己` |
| 購物金明細 | Supabase `wallet_transaction` | `WHERE wallet_id = 自己的 wallet` |
| 個人資料 | Medusa Customer + `customer_line_profiles` | `GET /store/customers/me` |
| LINE 綁定狀態 | `customer_line_profiles` | `WHERE line_user_id = 自己` |

---

## 四、LINE Login 流程（已確認）

```
使用者點擊「LINE 登入」按鈕
  │
  ▼
LIFF SDK liff.login() 跳轉 LINE 授權頁
  │
  ▼
使用者同意授權
  │
  ▼
回調到 /auth/line/callback
  │
  ▼
取得 line_user_id + display_name + email
  │
  ▼
查 customer_line_profiles（Supabase，用 service_role）
  │
  ├── 已存在 → 更新 last_active_at → 取得 customer_id
  │
  └── 不存在 → 查/建 Medusa Customer → 建立 profile → 取得 customer_id
  │
  ▼
設定 Session Cookie（含 customer_id）
  │
  ▼
導向會員頁面（或 redirect 參數指定的頁面）
```

**LIFF 設定（已在 LINE Developers Console）：**

| 設定項目 | 值 |
|---------|-----|
| LIFF app name | MINJIE STUDIO Login |
| Size | Full（全螢幕） |
| Endpoint URL | `https://shop.minjie0326.com/auth/line/callback` |
| Scope | profile, openid, email |
| Bot link feature | Aggressive（自動加好友） |

**環境變數**：`NEXT_PUBLIC_LIFF_ID`（前端可見）

---

## 五、Email 登入 + 信箱驗證流程（新增）

### 5.1 註冊流程

```
使用者在登入頁選擇「電子信箱註冊」
  │
  ▼
填寫：姓名、信箱、手機、密碼、確認密碼
  │
  ▼
前端驗證 → POST /api/auth/email/register
  │
  ▼
後端檢查 email 是否已存在（email_users 表）
  │
  ├── 已存在且已驗證 → 回傳「此信箱已註冊，請直接登入」
  ├── 已存在但未驗證 → 重新發送驗證碼
  └── 不存在 → 建立 email_users（email_verified = false）
  │
  ▼
生成 6 位數驗證碼 → 存入 email_verification_codes（10 分鐘過期）
  │
  ▼
寄送驗證信至使用者信箱
  │
  ▼
前端切換到 OTP 輸入畫面
  │
  ▼
使用者輸入 6 位驗證碼 → POST /api/auth/email/verify
  │
  ▼
後端驗證碼比對
  │
  ├── 正確 → 更新 email_verified = true → 建立 Medusa Customer → 設定 Session Cookie → 導向會員頁面
  ├── 錯誤但未超過 5 次 → 回傳「驗證碼錯誤，請重試」
  └── 錯誤且超過 5 次 → 回傳「驗證碼已失效，請重新發送」
```

### 5.2 登入流程

```
使用者在登入頁選擇「電子信箱登入」
  │
  ▼
填寫：信箱、密碼
  │
  ▼
POST /api/auth/email/login
  │
  ▼
後端查 email_users → bcrypt 比對密碼
  │
  ├── 信箱不存在 → 回傳「帳號或密碼錯誤」（不洩漏是帳號還是密碼錯）
  ├── 密碼錯誤 → 回傳「帳號或密碼錯誤」
  ├── 未驗證信箱 → 回傳「請先完成信箱驗證」+ 自動重發驗證碼
  └── 通過 → 設定 Session Cookie → 導向會員頁面
```

### 5.3 忘記密碼流程

```
使用者點擊「忘記密碼」→ 輸入信箱
  │
  ▼
POST /api/auth/email/forgot-password
  │
  ▼
生成 6 位數驗證碼（purpose = reset_password，10 分鐘過期）
  │
  ▼
寄送重設密碼信
  │
  ▼
使用者輸入驗證碼 + 新密碼
  │
  ▼
POST /api/auth/email/reset-password
  │
  ▼
驗證碼比對通過 → 更新 password_hash → 清除所有 session → 要求重新登入
```

### 5.4 帳號合併邏輯

當同一個人同時有 LINE 和 Email 帳號時：

```
LINE 登入取得 email（LIFF scope 含 email）
  │
  ▼
查 email_users 是否有相同 email
  │
  ├── 有 → 兩者共用同一個 Medusa customer_id
  │        customer_line_profiles.customer_id = email_users.customer_id
  │
  └── 無 → 各自獨立的 customer_id
  
※ 未來可在會員中心提供「綁定帳號」功能，手動合併
```

---

## 六、分階段實作計畫（已更新）

### Phase 0：緊急修復 — 登出功能（0.5 天）🔴

**不變，仍為最優先。**

#### 需要的 API

```
POST /api/auth/logout
```

功能：清除 Session Cookie → 回傳 `{ success: true }` → 前端 redirect 到首頁

#### 需要的前端改動

`LineLoginButton` 元件改為（或新建 `UserMenu` 元件）：

- 未登入狀態：顯示「登入」按鈕 → 導向 `/login`
- 已登入狀態：顯示使用者名稱/頭像 + 下拉選單
  - 我的帳號 → `/account`
  - 登出 → `POST /api/auth/logout`

#### 驗收標準

- LINE 登入後 Header 顯示使用者名稱
- 點擊「登出」後回到未登入狀態
- 重新整理頁面後確認已登出

---

### Phase 1A：登入頁面（1 天）🔴

**檔案：** `app/(website)/login/page.tsx`

**已完成設計稿**：`minjie-login-v2.jsx`（含完整 UI + 信箱驗證 OTP 流程）

設計要點：
- **主 CTA**：LINE 登入（LIFF SDK `liff.login()`）— 綠色大按鈕
- **次要入口**：Email 登入/註冊 — 金色分隔線下方
- **註冊流程**：填寫資料 → 下一步驗證信箱 → 輸入 6 位 OTP → 完成
- **安全提示**：「驗證碼已寄送至您的信箱」+ 60 秒倒數重送
- 支援 `?redirect=` 參數（結帳、會員中心等場景跳轉）

需要接入的 API：
| 動作 | API | 備註 |
|------|-----|------|
| LINE 登入 | `liff.login()` | LIFF SDK，不走 API Route |
| Email 註冊 | `POST /api/auth/email/register` | Phase 1C 建立 |
| 驗證信箱 | `POST /api/auth/email/verify` | Phase 1C 建立 |
| Email 登入 | `POST /api/auth/email/login` | Phase 1C 建立 |
| 忘記密碼 | `POST /api/auth/email/forgot-password` | Phase 1C 建立 |
| 重設密碼 | `POST /api/auth/email/reset-password` | Phase 1C 建立 |

---

### Phase 1B：會員中心（1.5 天）🟡

**檔案：** `app/(website)/account/page.tsx` + `AccountClient.tsx`

根據安全文件確認的資料來源，4 個 Tab 對應：

| Tab | 內容 | 資料來源（已確認） | API |
|-----|------|--------------------|-----|
| 訂單紀錄 | 歷史訂單列表 | Medusa Order | `GET /store/orders` 帶 JWT |
| 會員等級 | 等級卡 + 進度條 | Supabase `member_tier` + `tier_config` | `GET /api/member/tier` |
| 購物金 | 餘額 + 明細 | Supabase `member_wallet` + `wallet_transaction` | `GET /api/member/wallet` |
| 個人資料 | 編輯表單 | Medusa Customer + `customer_line_profiles` / `email_users` | `GET/PUT /api/member/profile` |

**保護路由**：未登入 → redirect `/login?redirect=/account`

---

### Phase 1C：後端 API + Supabase 設定（1.5 天）🟡

#### 新建 Supabase 表

- `email_users` — Email 認證用戶（見第二章 SQL）
- `email_verification_codes` — 驗證碼（見第二章 SQL）

> ⚠️ **不需要**建 v1 規劃的 `members` / `member_points` 表，這些功能已由現有的 `member_wallet` / `member_tier` 覆蓋。

#### 新建 API Routes

| 路由 | 方法 | 功能 | 備註 |
|------|------|------|------|
| `/api/auth/logout` | POST | 清除 Session Cookie | Phase 0 |
| `/api/auth/email/register` | POST | Email 註冊（建立未驗證帳號 + 發送 OTP） | 需要寄信服務 |
| `/api/auth/email/verify` | POST | 驗證 OTP → 完成註冊 | |
| `/api/auth/email/login` | POST | Email 密碼登入 | |
| `/api/auth/email/forgot-password` | POST | 發送重設密碼 OTP | |
| `/api/auth/email/reset-password` | POST | 驗證 OTP + 更新密碼 | |
| `/api/auth/email/resend-otp` | POST | 重新發送驗證碼 | 60 秒限制 |
| `/api/member/profile` | GET/PUT | 讀取/更新個人資料 | |
| `/api/member/tier` | GET | 讀取會員等級 + 升等進度 | 查 `member_tier` + `tier_config` |
| `/api/member/wallet` | GET | 讀取購物金餘額 + 明細 | 查 `member_wallet` + `wallet_transaction` |

#### 寄信服務選項

Email 驗證碼需要寄信服務，建議選項：

| 選項 | 費用 | 備註 |
|------|------|------|
| **Resend**（推薦） | 免費 3,000 封/月 | API 簡單、Next.js 友好 |
| Supabase Edge Function + SMTP | 依 SMTP 服務 | 已有 Edge Function 架構 |
| SendGrid | 免費 100 封/天 | 業界標準但設定較繁瑣 |

---

### Phase 2：完善會員功能（3-5 天）🔵

| 項目 | 說明 |
|------|------|
| 訂單詳情頁 | `/account/orders/[id]` — 顯示訂單商品、物流追蹤、付款狀態 |
| 購物金明細頁 | 完整的獲得/使用/到期紀錄時間軸（`wallet_transaction`） |
| 會員等級升級規則 | 依 `tier_config` 的 `min_spent` 自動升級，顯示進度條 |
| 收件地址管理 | 儲存常用地址，結帳時快速選取 |
| LINE 綁定資訊 | 顯示已綁定的 LINE 帳號（`customer_line_profiles`） |
| 帳號合併 | 會員中心提供「綁定 LINE / 綁定 Email」功能 |

### Phase 3：進階功能（選配）⚪

| 項目 | 說明 |
|------|------|
| 手機 OTP 登入 | 台灣市場常見，但需 SMS 成本 |
| 社群登入 | Google / Apple（降低註冊門檻） |
| 雙因素驗證 | VIP 會員可選啟用 |

---

## 七、安全規範（來自安全文件）

### 7.1 前台 Session Cookie 要求

| 設定 | 值 | 說明 |
|------|-----|------|
| HttpOnly | `true` | 防止 JS 存取 cookie |
| Secure | `true` | 僅 HTTPS 傳送 |
| SameSite | `Lax` 或 `Strict` | 防 CSRF |
| Max-Age | 依需求（建議 7 天） | Session 有效期 |

### 7.2 Email 認證安全要求

| 項目 | 規範 |
|------|------|
| 密碼儲存 | bcrypt hash（cost factor ≥ 10） |
| 驗證碼 | 6 位數字、10 分鐘過期、最多 5 次嘗試 |
| 發送限制 | 同一 email 每 60 秒只能發一次 |
| 登入錯誤 | 不區分「帳號不存在」和「密碼錯誤」（統一回傳「帳號或密碼錯誤」） |
| 密碼規則 | 至少 8 個字元 |

### 7.3 API Key 規範（摘自安全文件 §4.1）

| Key | 前端可見？ | 備註 |
|-----|:--------:|------|
| `NEXT_PUBLIC_LIFF_ID` | ✅ | LIFF App ID |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ | 前端查詢用，RLS 保護 |
| `SUPABASE_SERVICE_ROLE_KEY` | ❌ | 繞過 RLS，永遠只在 server-side |
| `GATEWAY_API_KEY` | ❌ | ECPay Gateway，透過 API Route 中繼 |

### 7.4 CORS 設定

只允許：`shop.minjie0326.com` + `*.liff.line.me`

---

## 八、環境變數參考（摘自安全文件 §5）

### Storefront (Vercel)

| 變數 | 用途 | 前端/後端 |
|------|------|----------|
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | Medusa API | 前端 |
| `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` | Store API Key | 前端 |
| `NEXT_PUBLIC_GATEWAY_URL` | ECPay Gateway | 前端 |
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF App ID | 前端 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 前端 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase 匿名 Key | 前端 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 管理 Key | **後端 only** |
| `GATEWAY_API_KEY` | ECPay Gateway API Key | **後端 only** |

### 連線資訊

| 服務 | URL |
|------|-----|
| Medusa | `https://medusa-store-minjie-production.up.railway.app` |
| ECPay Gateway | `https://ecpay-gateway-production.up.railway.app` |
| Supabase | `https://ephdzjkgpkuydpbkxnfw.supabase.co` |
| CMS Admin | `https://admin.astrapath-marketing.com` |
| LINE Channel ID | `2009072816` |

---

## 九、各專家角色分工（已更新）

### 技術長（CTO）

- ~~確認 session 存儲方式~~ → ✅ 已由安全文件確認為 Session Cookie
- ~~確認 `LineLoginButton` 原始碼~~ → 安全文件已說明 LIFF SDK 流程
- 簽核 Email 認證方案（自建 vs Supabase Auth）
- 審核 `email_users` / `email_verification_codes` schema
- 選定寄信服務（Resend / SendGrid / SMTP）
- 確認 Phase 優先順序

### 前端工程師

- Phase 0：修改 Header 登入/登出元件（用 `liff.login()` 觸發）
- Phase 1A：接入 `/login` 頁面的 API（登入頁 UI 已完成）
- Phase 1B：建立 `/account` 頁面（4 Tab UI）

### 後端工程師

- Phase 0：建立 `POST /api/auth/logout`
- Phase 1C：在 Supabase 建立 `email_users` + `email_verification_codes` 表
- Phase 1C：建立 Email 認證 API（register / verify / login / forgot / reset）
- Phase 1C：串接寄信服務
- Phase 1B：建立 `/api/member/*` API（profile / tier / wallet）
- 在 Email 註冊流程中加入建立 Medusa Customer 的邏輯

### UX 設計師

- ~~設計登入頁面~~ → ✅ 已完成（`minjie-login-v2.jsx`）
- 設計會員中心 4 Tab 互動流程
- 設計 Header 登入/登出互動狀態
- 設計信箱驗證信的 Email 模板

### 安全性審核

- ✅ Session Cookie 設定（HttpOnly + Secure + SameSite）— 已有規範
- ✅ RLS 規則 — 已有，Email 新表需補上
- 確認 Email 認證 API 的 rate limiting
- 確認密碼 hash 使用 bcrypt 且 cost factor ≥ 10
- 確認 OTP 防暴力破解機制（5 次上限 + 60 秒重送限制）

---

## 十、工時估算總覽（已更新）

| Phase | 內容 | 工時 | 優先級 |
|-------|------|------|--------|
| Phase 0 | 登出功能 | 0.5 天 | 🔴 立即 |
| Phase 1A | 登入頁面（API 接入） | 1 天 | 🔴 本週 |
| Phase 1B | 會員中心（4 Tab） | 1.5 天 | 🟡 本週 |
| Phase 1C | Email 認證 API + Supabase 表 + 寄信服務 | 1.5 天 | 🟡 本週 |
| Phase 2 | 完善會員功能 | 3-5 天 | 🔵 下週 |
| Phase 3 | 進階功能 | 待定 | ⚪ 待定 |

**Phase 0 + 1 合計約 4.5 個工作天**（比 v1 多 1.5 天，因加入 Email 認證）

---

## 十一、技術長待確認事項 Checklist（已更新）

已確認項目以 ✅ 標示，剩餘待確認項目：

- [x] 確認 LINE Login 使用 LIFF SDK（`liff.login()`）
- [x] 確認 Session 儲存為 Cookie
- [x] 確認現有表結構（`customer_line_profiles` / `member_wallet` / `member_tier`）
- [x] 架構決策 1：Session → 選項 A（Cookie）
- [x] 架構決策 3：會員資料 → 選項 C（Medusa + Supabase 並用）
- [ ] 簽核 Email 認證方案（自建 + `email_users` 表）
- [ ] 選定寄信服務（Resend / SendGrid / SMTP）
- [ ] 確認 `email_users` + `email_verification_codes` schema
- [ ] 確認帳號合併邏輯（LINE email = Email 帳號 email → 共用 customer_id）
- [ ] 確認 Phase 0 → 1A → 1B/1C → 2 優先順序
- [ ] 確認是否需要在 LINE Login callback 中檢查並合併 Email 帳號

---

## 十二、已完成的交付物

| 項目 | 檔案 | 狀態 |
|------|------|:----:|
| 登入頁 UI（含信箱驗證 OTP） | `minjie-login-v2.jsx` | ✅ 已完成 |
| 認證系統規劃 v2 | 本文件 | ✅ 已完成 |
| 安全技術文件 | `MINJIE_Auth_Security_Technical_Guide_v1_0.docx` | ✅ 已有 |

---

*本規劃文件配合 `Auth_Security_Technical_Guide_v1_0`、`CTO_Audit_Report` 和 `Implementation_Guide_v2` 使用。*
