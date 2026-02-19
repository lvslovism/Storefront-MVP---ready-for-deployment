# MINJIE STUDIO — WebAuthn / Passkey 無密碼登入 SDD v1.0

> 版本：v1.0  
> 日期：2026-02-19  
> 狀態：待確認  
> 適用範圍：客戶端（shop.minjie0326.com）+ 管理端（admin.astrapath-marketing.com）  
> 前置文件：`MINJIE_Member_System_SDD_v1_1.md`、`sdd-secure-architecture.md`、`MINJIE_SYSTEM_BLUEPRINT.md`

---

## 一、Executive Summary

在現有 LINE OAuth + Email/Password 認證體系上，新增 WebAuthn/Passkey 作為**快速登入選項**。用戶首次透過現有方式登入後，可註冊裝置的生物辨識（Face ID / Touch ID / Windows Hello）作為 Passkey。後續登入時，一鍵觸發裝置生物辨識即可完成認證。

**核心原則：系統永不碰觸生物特徵資料。** 所有生物辨識在裝置端完成，server 僅儲存公鑰。

---

## 二、架構決策記錄

| 決策 | 選擇 | 原因 |
|------|------|------|
| 技術路線 | WebAuthn/Passkey（非自建臉辨） | 零個資風險、W3C 標準、裝置原生支援 |
| 定位 | 快速登入（需先綁定帳號） | 降低導入門檻，不影響現有流程 |
| Library | `@simplewebauthn/server` + `@simplewebauthn/browser` | 最成熟的 WebAuthn JS 庫，維護者是 W3C WebAuthn WG 成員 |
| Challenge 儲存 | DB 表 `webauthn_challenges`（TTL 5 分鐘） | 無狀態 server，不依賴 memory/session |
| Credential 儲存 | DB 表 `webauthn_credentials` | 統一客戶端 + 管理端，`user_type` 欄位區分 |
| RP ID | `minjie0326.com`（客戶端）/ `astrapath-marketing.com`（管理端） | WebAuthn 規範要求 RP ID 必須是當前域名或其父域名 |
| Discoverable Credential | 啟用（`residentKey: 'preferred'`） | 支援 Conditional UI（瀏覽器 autofill 提示 passkey） |
| User Verification | `required` | 強制裝置端生物辨識驗證，確保雙因子 |
| LINE In-App Browser | 不啟用 Passkey，維持 LINE OAuth | LINE WebView 對 WebAuthn API 支援不穩定 |

---

## 三、用戶流程

### 3.1 Passkey 註冊流程（綁定）

```
用戶已登入（LINE OAuth 或 Email）
  → 進入「會員中心 > 安全設定」
  → 點擊「啟用快速登入」
  → 瀏覽器觸發 WebAuthn Registration Ceremony
  → 裝置顯示生物辨識提示（Face ID / Touch ID / Windows Hello）
  → 用戶驗證通過
  → 瀏覽器回傳 attestation response
  → Server 驗證 + 儲存公鑰到 webauthn_credentials
  → 顯示「已啟用！下次可直接使用臉部辨識/指紋登入」
```

### 3.2 Passkey 登入流程

```
用戶到登入頁
  → 頁面載入時偵測 WebAuthn 支援
  → 支援：顯示「快速登入」按鈕（Face ID / 指紋圖示）
  → 不支援：隱藏按鈕，正常顯示 LINE + Email 登入
  
用戶點擊「快速登入」
  → Client 呼叫 /api/auth/passkey/authenticate/options
  → Server 生成 challenge → 存入 webauthn_challenges
  → 瀏覽器觸發 WebAuthn Authentication Ceremony
  → 裝置顯示生物辨識提示
  → 用戶驗證通過
  → Client 呼叫 /api/auth/passkey/authenticate/verify
  → Server 驗證 signature + 查找 credential → 取得 user_id
  → 建立 session cookie（與現有 line_session 格式一致）
  → 導向會員中心 or 首頁
```

### 3.3 Conditional UI 流程（瀏覽器 Autofill）

```
用戶到登入頁
  → 頁面載入時呼叫 startAuthentication({ useBrowserAutofill: true })
  → 如果瀏覽器有此站的 Passkey → 在 email 輸入框顯示 autofill 提示
  → 用戶選擇 Passkey → 觸發生物辨識 → 自動登入
  → 用戶不選 → 正常輸入 Email/Password 或點 LINE 登入
```

### 3.4 管理端流程

```
管理員已登入 CMS（Supabase Auth）
  → 進入「設定 > 安全」
  → 點擊「啟用 Passkey」
  → 同 3.1 註冊流程
  → 後續：登入頁顯示「使用 Passkey 登入」按鈕
  → 驗證通過 → 建立 Supabase Auth session
```

### 3.5 LINE In-App Browser 策略

```
偵測 User-Agent 含 "Line/" 或 window.liff
  → 隱藏所有 Passkey 相關 UI
  → 維持現有 LINE OAuth 快速登入（一鍵）
  → 用戶本來就是用 LINE 開的，LINE OAuth 零摩擦
```

---

## 四、資料庫設計

### 4.1 新建表：webauthn_credentials

```sql
-- ============================================
-- WebAuthn Credentials（存放公鑰）
-- Schema: public
-- ============================================
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- 用戶關聯（polymorphic）
  user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('customer', 'admin')),
  user_id VARCHAR(255) NOT NULL,  -- customer: customer_id / admin: admin_users.id
  
  -- WebAuthn 核心欄位
  credential_id TEXT NOT NULL UNIQUE,          -- base64url encoded credential ID
  public_key BYTEA NOT NULL,                   -- COSE public key（binary）
  counter BIGINT NOT NULL DEFAULT 0,           -- signature counter（防 clone）
  
  -- 裝置資訊（顯示用）
  device_name VARCHAR(255),                    -- 用戶自訂名稱 or 自動偵測
  device_type VARCHAR(50),                     -- 'platform' | 'cross-platform'
  aaguid VARCHAR(36),                          -- Authenticator Attestation GUID
  
  -- Transports（JSON array: ['internal', 'hybrid', 'ble', 'nfc', 'usb']）
  transports JSONB DEFAULT '[]',
  
  -- RP 資訊
  rp_id VARCHAR(255) NOT NULL,                 -- 'minjie0326.com' or 'astrapath-marketing.com'
  
  -- 狀態
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_webauthn_user ON webauthn_credentials(user_type, user_id);
CREATE INDEX idx_webauthn_credential_id ON webauthn_credentials(credential_id);
CREATE INDEX idx_webauthn_rp ON webauthn_credentials(rp_id);

-- RLS：僅 service_role 可存取
ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;
-- 不建立任何 anon/authenticated policy = 前端無法直接存取

COMMENT ON TABLE webauthn_credentials IS 'WebAuthn/Passkey 公鑰憑證';
```

### 4.2 新建表：webauthn_challenges

```sql
-- ============================================
-- WebAuthn Challenges（暫存，TTL 5 分鐘）
-- Schema: public
-- ============================================
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge TEXT NOT NULL UNIQUE,               -- base64url encoded challenge
  user_type VARCHAR(20),                        -- 註冊時有值，登入時可能 null
  user_id VARCHAR(255),                         -- 註冊時有值，登入時可能 null
  ceremony_type VARCHAR(20) NOT NULL CHECK (ceremony_type IN ('registration', 'authentication')),
  rp_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,              -- 建立時間 + 5 分鐘
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_challenge_lookup ON webauthn_challenges(challenge);
CREATE INDEX idx_challenge_expires ON webauthn_challenges(expires_at);

-- RLS
ALTER TABLE webauthn_challenges ENABLE ROW LEVEL SECURITY;

-- 自動清理過期 challenge（pg_cron 每 10 分鐘）
-- SELECT cron.schedule('clean-webauthn-challenges', '*/10 * * * *', 
--   $$DELETE FROM webauthn_challenges WHERE expires_at < NOW()$$
-- );

COMMENT ON TABLE webauthn_challenges IS 'WebAuthn Challenge 暫存（5 分鐘過期）';
```

### 4.3 Schema 變更摘要

| 操作 | 表名 | Schema | 說明 |
|------|------|--------|------|
| CREATE | `webauthn_credentials` | public | 儲存公鑰，polymorphic 設計支援客戶+管理員 |
| CREATE | `webauthn_challenges` | public | Challenge 暫存，TTL 5 分鐘自動清理 |
| 不變 | `email_users` | public | 不需修改 |
| 不變 | `customer_line_profiles` | public | 不需修改 |
| 不變 | `admin_users` | cms | 不需修改 |

---

## 五、API 規格

### 5.1 客戶端 API（Storefront — 4 支）

#### POST `/api/auth/passkey/register/options`

生成 Registration Options（需已登入）

```typescript
// Request: 無 body（從 session 取 customer_id）
// 認證：需登入（line_session cookie）

// Response 200:
{
  options: PublicKeyCredentialCreationOptionsJSON,
  // 內含 challenge, rp, user, pubKeyCredParams, timeout, attestation, authenticatorSelection
}

// Response 401: 未登入
// Response 409: 此帳號已有 Passkey（同裝置）
```

**Server 邏輯：**
1. 從 session 取得 `customer_id` + `display_name` + `email`
2. 查 `webauthn_credentials` 取得已有的 credential IDs（excludeCredentials）
3. 生成 options（`@simplewebauthn/server` → `generateRegistrationOptions`）
4. 將 challenge 寫入 `webauthn_challenges`（TTL 5 分鐘）
5. 回傳 options JSON

**關鍵參數：**
```typescript
const options = await generateRegistrationOptions({
  rpName: 'MINJIE STUDIO',
  rpID: 'minjie0326.com',
  userName: email || `user_${customer_id}`,
  userDisplayName: display_name || 'MINJIE 會員',
  userID: isoUint8Array.fromUTF8String(customer_id),
  attestationType: 'none',           // 不需要 attestation（簡化流程）
  authenticatorSelection: {
    residentKey: 'preferred',         // 支援 discoverable credential
    userVerification: 'required',     // 強制生物辨識
    authenticatorAttachment: 'platform',  // 限定平台驗證器（Face ID / Touch ID / Windows Hello）
  },
  excludeCredentials: existingCredentials.map(c => ({
    id: c.credential_id,
    transports: c.transports,
  })),
  timeout: 300000,  // 5 分鐘
});
```

---

#### POST `/api/auth/passkey/register/verify`

驗證 Registration Response + 儲存公鑰（需已登入）

```typescript
// Request:
{
  response: RegistrationResponseJSON,  // 瀏覽器回傳的 attestation response
  deviceName?: string                  // 可選：用戶自訂裝置名稱
}

// Response 200:
{
  success: true,
  credential: {
    id: string,
    deviceName: string,
    createdAt: string
  }
}

// Response 400: 驗證失敗
// Response 401: 未登入
```

**Server 邏輯：**
1. 從 `webauthn_challenges` 查找並驗證 challenge（比對 + 刪除 + 檢查過期）
2. 呼叫 `verifyRegistrationResponse` 驗證 attestation
3. 驗證通過 → 寫入 `webauthn_credentials`
4. 自動偵測裝置名稱（從 User-Agent 判斷 iPhone / Mac / Windows）
5. 回傳成功 + credential 資訊

---

#### POST `/api/auth/passkey/authenticate/options`

生成 Authentication Options（不需登入）

```typescript
// Request: 無 body
// 認證：不需

// Response 200:
{
  options: PublicKeyCredentialRequestOptionsJSON,
}
```

**Server 邏輯：**
1. 生成 authentication options（allowCredentials 留空 → discoverable credential）
2. 將 challenge 寫入 `webauthn_challenges`
3. 回傳 options

**關鍵參數：**
```typescript
const options = await generateAuthenticationOptions({
  rpID: 'minjie0326.com',
  userVerification: 'required',
  timeout: 300000,
  // allowCredentials 留空 → 瀏覽器自動尋找所有此 RP 的 passkey
});
```

---

#### POST `/api/auth/passkey/authenticate/verify`

驗證 Authentication Response + 建立 Session

```typescript
// Request:
{
  response: AuthenticationResponseJSON
}

// Response 200:
{
  success: true,
  user: {
    customer_id: string,
    display_name: string,
    email?: string,
    auth_method: 'passkey'
  }
}
// + Set-Cookie: line_session（與現有格式一致）

// Response 400: 驗證失敗
// Response 404: 找不到對應的 credential
```

**Server 邏輯：**
1. 從 response 取出 `credential_id`
2. 查 `webauthn_credentials` 找到對應的 credential + user
3. 從 `webauthn_challenges` 取出並驗證 challenge
4. 呼叫 `verifyAuthenticationResponse` 驗證 signature
5. 驗證 counter（必須 > 儲存的 counter，防 credential clone）
6. 更新 counter + `last_used_at`
7. 根據 `user_type` 查找用戶資料：
   - `customer` → 查 `customer_line_profiles` 或 `email_users`
   - 建立 `line_session` cookie（`auth_method: 'passkey'`）
8. 回傳成功

---

### 5.2 管理端 API（CMS — 4 支）

路由結構相同，部署在 CMS Admin：

| 路由 | 方法 | 功能 | 認證 |
|------|------|------|------|
| `/api/admin/passkey/register/options` | POST | 生成註冊選項 | 需 Supabase Auth |
| `/api/admin/passkey/register/verify` | POST | 驗證註冊 + 存公鑰 | 需 Supabase Auth |
| `/api/admin/passkey/authenticate/options` | POST | 生成驗證選項 | 不需 |
| `/api/admin/passkey/authenticate/verify` | POST | 驗證 + 建立 session | 不需 |

差異點：
- `rpID`: `astrapath-marketing.com`
- `rpName`: `Astrapath CMS`
- `user_type`: `admin`
- `user_id`: `admin_users.id`
- Session 建立方式：呼叫 Supabase Auth `signInWithIdToken` 或自建 session

---

### 5.3 管理 API（Passkey 管理 — 2 支）

#### GET `/api/auth/passkey/credentials`

列出當前用戶的所有 Passkey（需登入）

```typescript
// Response 200:
{
  credentials: [{
    id: string,
    deviceName: string,
    deviceType: string,
    lastUsedAt: string | null,
    createdAt: string
  }]
}
```

#### DELETE `/api/auth/passkey/credentials/[id]`

刪除指定 Passkey（需登入）

```typescript
// Response 200: { success: true }
// Response 404: 找不到或非本人的 credential
```

---

## 六、前端實作

### 6.1 新增檔案（Storefront）

```
lib/
└── webauthn.ts                      # WebAuthn 工具函式（偵測支援、LINE 判斷）

app/api/auth/passkey/
├── register/
│   ├── options/route.ts             # POST - 生成註冊選項
│   └── verify/route.ts              # POST - 驗證註冊
├── authenticate/
│   ├── options/route.ts             # POST - 生成驗證選項
│   └── verify/route.ts              # POST - 驗證登入
└── credentials/
    ├── route.ts                     # GET - 列出 Passkeys
    └── [id]/route.ts                # DELETE - 刪除 Passkey

components/auth/
├── PasskeyLoginButton.tsx           # 登入頁「快速登入」按鈕
└── PasskeyManager.tsx               # 會員中心 Passkey 管理 UI
```

### 6.2 修改檔案（Storefront）

```
app/(website)/login/LoginClient.tsx   # 新增 PasskeyLoginButton + Conditional UI
app/(website)/account/AccountClient.tsx # 安全設定 Tab 新增 PasskeyManager
```

### 6.3 WebAuthn 工具函式

```typescript
// lib/webauthn.ts

/**
 * 偵測是否在 LINE In-App Browser 內
 */
export function isLineInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.includes('line/') || ua.includes('liff');
}

/**
 * 偵測瀏覽器是否支援 WebAuthn
 */
export async function isWebAuthnSupported(): Promise<boolean> {
  if (isLineInAppBrowser()) return false;
  if (typeof window === 'undefined') return false;
  if (!window.PublicKeyCredential) return false;
  
  try {
    // 檢查平台驗證器是否可用（Face ID / Touch ID / Windows Hello）
    const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
    return available;
  } catch {
    return false;
  }
}

/**
 * 偵測是否支援 Conditional UI（瀏覽器 autofill passkey）
 */
export async function isConditionalUISupported(): Promise<boolean> {
  if (!await isWebAuthnSupported()) return false;
  try {
    // @ts-ignore — 部分瀏覽器尚未完整 type
    return await PublicKeyCredential.isConditionalMediationAvailable?.() ?? false;
  } catch {
    return false;
  }
}

/**
 * 從 User-Agent 推斷裝置名稱
 */
export function guessDeviceName(): string {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return 'iPhone (Face ID)';
  if (/iPad/.test(ua)) return 'iPad (Touch ID)';
  if (/Macintosh/.test(ua)) return 'Mac (Touch ID)';
  if (/Windows/.test(ua)) return 'Windows (Windows Hello)';
  if (/Android/.test(ua)) return 'Android';
  return '未知裝置';
}
```

### 6.4 登入頁整合邏輯

```
LoginClient.tsx 載入時：
  1. isWebAuthnSupported() → 決定是否顯示 PasskeyLoginButton
  2. isConditionalUISupported() → 決定是否啟動 Conditional UI
  
  if (conditionalUI) {
    // 在 email input 加上 autoComplete="webauthn"
    // 背景呼叫 startAuthentication({ useBrowserAutofill: true })
    // 用戶在 autofill 選 passkey → 自動觸發驗證
  }
  
UI 佈局（由上到下）：
  ┌─────────────────────────────┐
  │ [👤 Face ID / 指紋快速登入]  │  ← PasskeyLoginButton（僅支援時顯示）
  │                             │
  │ ─────── 或 ────────         │
  │                             │
  │ [🟢 LINE 快速登入]          │  ← 現有
  │                             │
  │ ─────── 或 ────────         │
  │                             │
  │ Email: [____________]       │  ← 現有（autoComplete="webauthn" for Conditional UI）
  │ 密碼:  [____________]       │
  │ [登入]  [忘記密碼?]          │
  └─────────────────────────────┘
```

### 6.5 會員中心整合

```
AccountClient.tsx — 安全設定區塊（新增 Tab 或嵌入個人資料頁底部）：

  ┌─────────────────────────────────────────┐
  │ 🔐 安全設定                              │
  │                                         │
  │ 快速登入（Face ID / 指紋）               │
  │                                         │
  │ ┌───────────────────────────────────┐   │
  │ │ 📱 iPhone (Face ID)               │   │
  │ │    上次使用：2026-02-19 14:30     │   │
  │ │                        [移除]     │   │
  │ └───────────────────────────────────┘   │
  │                                         │
  │ [+ 新增裝置]                             │
  │                                         │
  │ ℹ️ 啟用後，下次可直接使用臉部辨識或      │
  │    指紋登入，不需要輸入密碼              │
  └─────────────────────────────────────────┘
```

---

## 七、安全設計

### 7.1 威脅模型

| 威脅 | 對策 |
|------|------|
| Credential Clone（複製私鑰） | Signature counter 遞增驗證，counter 不增 → 拒絕 |
| Replay Attack（重放攻擊） | Challenge 一次性使用，5 分鐘過期，使用後立即刪除 |
| Phishing（釣魚） | WebAuthn 原生防護 — credential 綁定 RP ID（域名），釣魚站域名不同 → 無法觸發 |
| MITM（中間人） | TLS + Origin 驗證（WebAuthn 協議內建） |
| 帳號接管 | Passkey 註冊需先登入，不影響帳號復原流程（Email OTP 仍可用） |
| 暴力枚舉 credential_id | credential_id 是高熵隨機值，不可枚舉 |
| Challenge 竊取 | Challenge 存 server side（DB），不暴露生成邏輯 |
| 裝置遺失 | 用戶可用 Email/Password 或 LINE OAuth 登入後，在安全設定移除遺失裝置的 Passkey |

### 7.2 CORS 設定

```typescript
// Passkey API 的 CORS 必須嚴格限制
// Registration/Verify 端點：
Access-Control-Allow-Origin: https://shop.minjie0326.com
Access-Control-Allow-Methods: POST
Access-Control-Allow-Headers: Content-Type
Access-Control-Allow-Credentials: true
```

### 7.3 Rate Limiting

| 端點 | 限制 | 原因 |
|------|------|------|
| `*/options` | 20 次/分鐘/IP | 防止 challenge 生成濫用 |
| `*/verify` | 10 次/分鐘/IP | 防止暴力驗證 |
| `credentials` (DELETE) | 5 次/分鐘/用戶 | 防止誤刪 |

### 7.4 不儲存的資料

| 資料 | 是否儲存 | 說明 |
|------|:--------:|------|
| 公鑰 | ✅ 儲存 | COSE 格式，binary |
| 私鑰 | ❌ 不碰 | 永遠留在用戶裝置 |
| 生物特徵（臉、指紋） | ❌ 不碰 | 裝置 Secure Enclave 內 |
| Attestation 證書 | ❌ 不存 | `attestationType: 'none'`，不需要 |
| Challenge | ⏱ 暫存 | 5 分鐘過期自動刪除 |

---

## 八、Dependencies

### 8.1 npm 套件

```json
// Storefront (shop.minjie0326.com)
{
  "@simplewebauthn/browser": "^11.0.0",   // 前端 WebAuthn API 封裝
  "@simplewebauthn/server": "^11.0.0"     // 後端驗證邏輯
}

// CMS Admin (admin.astrapath-marketing.com)  
{
  "@simplewebauthn/browser": "^11.0.0",
  "@simplewebauthn/server": "^11.0.0"
}
```

### 8.2 環境變數

| 變數 | 位置 | 值 |
|------|------|-----|
| `WEBAUTHN_RP_ID` | Storefront .env | `minjie0326.com` |
| `WEBAUTHN_RP_NAME` | Storefront .env | `MINJIE STUDIO` |
| `WEBAUTHN_RP_ID` | CMS .env | `astrapath-marketing.com` |
| `WEBAUTHN_RP_NAME` | CMS .env | `Astrapath CMS` |
| `WEBAUTHN_ORIGIN` | Storefront .env | `https://shop.minjie0326.com` |
| `WEBAUTHN_ORIGIN` | CMS .env | `https://admin.astrapath-marketing.com` |

---

## 九、實作排程

### Phase 1：客戶端（Storefront）— 1.5 週

| 天 | 任務 | 產出 |
|----|------|------|
| D1 | DB 建表 + npm install + lib/webauthn.ts | SQL 已執行、套件安裝 |
| D2 | Register Options + Verify API（2 支） | Passkey 註冊可運作 |
| D3 | Authenticate Options + Verify API（2 支） | Passkey 登入可運作 |
| D4 | Credentials GET + DELETE API（2 支） | 管理 Passkey 可運作 |
| D5 | LoginClient 整合 + PasskeyLoginButton | 登入頁 UI 完成 |
| D6 | AccountClient 整合 + PasskeyManager | 會員中心 UI 完成 |
| D7 | Conditional UI + LINE In-App 偵測 + E2E 測試 | 全流程測試通過 |

### Phase 2：管理端（CMS）— 0.5 週

| 天 | 任務 | 產出 |
|----|------|------|
| D8 | CMS 端 4 支 API（複用 Storefront 邏輯，改 RP ID + session） | API 完成 |
| D9 | CMS 登入頁 + 設定頁 UI 整合 | 管理端 Passkey 完成 |
| D10 | 跨端測試（iPhone Safari / Chrome / Windows Hello） | 全部驗收 |

### Phase 3：優化（未來）

- Conditional UI 微調（autofill UX）
- Passkey 跨裝置同步提示（iCloud Keychain / Google Password Manager）
- 管理端 Passkey 強制（owner 必須啟用）
- Analytics：Passkey 使用率追蹤

---

## 十、測試矩陣

| # | 裝置 | 瀏覽器 | 驗證方式 | 預期行為 |
|---|------|--------|---------|---------|
| T1 | iPhone 15 | Safari | Face ID | 註冊 + 登入正常 |
| T2 | iPhone 15 | LINE In-App | — | Passkey 按鈕不顯示，LINE OAuth 正常 |
| T3 | iPhone 15 | Chrome | Face ID | 註冊 + 登入正常 |
| T4 | MacBook Pro | Safari | Touch ID | 註冊 + 登入正常 |
| T5 | MacBook Pro | Chrome | Touch ID | 註冊 + 登入正常 |
| T6 | Windows 11 PC | Chrome | Windows Hello (臉部) | 註冊 + 登入正常 |
| T7 | Windows 11 PC | Edge | Windows Hello (指紋) | 註冊 + 登入正常 |
| T8 | Android | Chrome | 指紋/臉部 | 註冊 + 登入正常 |
| T9 | Android | LINE In-App | — | Passkey 按鈕不顯示 |
| T10 | 任何裝置 | 不支援 WebAuthn 的瀏覽器 | — | Passkey 完全隱藏，現有流程不受影響 |
| T11 | 已有 Passkey | 刪除 Passkey 後 | Email/Password | 正常 fallback |
| T12 | 同帳號 | 2 台裝置各註冊 Passkey | 兩台都能登入 | credential 獨立 |
| T13 | 遺失裝置 | Email OTP 登入 | 刪除舊 Passkey | 帳號恢復正常 |

---

## 十一、FAQ

**Q: 用戶換手機了怎麼辦？**
A: 如果使用 iCloud Keychain 或 Google Password Manager，Passkey 會自動同步到新裝置。否則用 Email/Password 或 LINE OAuth 登入後，在安全設定移除舊 Passkey、註冊新裝置。

**Q: 如果用戶同時有 LINE + Email + Passkey，session 怎麼管理？**
A: 統一使用 `line_session` cookie（歷史命名），`auth_method` 欄位區分 `'line'` / `'email'` / `'passkey'`。一個 session = 一種登入方式，不疊加。

**Q: 為什麼 attestationType 設為 'none'？**
A: 我們不需要驗證裝置來源（不是銀行），`none` 簡化流程、提高相容性。如果未來有 KYC 需求，可改為 `'direct'` 取得 attestation 證書。

**Q: 管理端是否應該強制 Passkey？**
A: Phase 1 先作為可選項。Phase 3 可評估將 owner 角色強制啟用 Passkey 作為 MFA。

**Q: WebAuthn credentials 需要加密嗎？**
A: 不需要。公鑰本身就是「公開的」，就像 SSH 的 authorized_keys。安全性來自私鑰（永遠在裝置端）。

---

## 十二、Claude Code 實作指示

```markdown
## WebAuthn/Passkey 實作指示

### 環境準備
npm install @simplewebauthn/server @simplewebauthn/browser

### DB 遷移
執行本文件 Section 四 的 SQL（webauthn_credentials + webauthn_challenges）

### 實作順序
1. lib/webauthn.ts（工具函式）
2. Register Options API → Register Verify API
3. Authenticate Options API → Authenticate Verify API  
4. Credentials GET/DELETE API
5. LoginClient.tsx 整合
6. AccountClient.tsx 整合
7. LINE In-App Browser 偵測

### 關鍵注意事項
- RP ID 必須是 `minjie0326.com`（不是 `shop.minjie0326.com`）
- challenge 用後即刪，不可重用
- counter 必須嚴格遞增檢查
- 所有 API 用 supabase service_role 存取 DB
- session cookie 格式與現有 line_session 完全一致
- LINE In-App Browser 偵測放在 client side（不是 server side）
```

---

*文件結束*
