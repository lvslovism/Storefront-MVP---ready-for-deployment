# WebAuthn / Passkey — Claude Code 實作指令

> 版本：v1.0 ｜ 日期：2026-02-19
>
> 用途：貼給 Claude Code 執行，在 Storefront 實作 WebAuthn/Passkey 快速登入
>
> 專案路徑：`O:\Projects\Storefront-MVP---ready-for-deployment`
>
> 設計文件：`WebAuthn_Passkey_SDD_v1_0.md`（v1.1，已含多商家支援）

---

## 使用方式

1. 開啟終端機，cd 到 `O:\Projects\Storefront-MVP---ready-for-deployment`
2. 啟動 Claude Code：`claude`
3. 按 Step 順序，每步完成後驗證再進下一步
4. 每完成一個 Step 就 commit

---

## Step 0：執行 SQL（手動在 Supabase Dashboard）

先到 Supabase Dashboard → SQL Editor，執行 `webauthn_schema.sql` 的內容。

建表完成後驗證：

```sql
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('webauthn_credentials', 'webauthn_challenges');
-- 應回傳 2 行

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'webauthn_credentials' AND column_name = 'merchant_code';
-- 應回傳 1 行
```

---

## Step 1：安裝套件 + 環境變數 + 工具函式

```
請在 O:\Projects\Storefront-MVP---ready-for-deployment 執行以下操作。

## 1. 安裝 npm 套件

npm install @simplewebauthn/server @simplewebauthn/browser

## 2. 環境變數

在 .env.local 新增以下變數（不要覆蓋現有的）：

WEBAUTHN_RP_ID=minjie0326.com
WEBAUTHN_RP_NAME=MINJIE STUDIO
WEBAUTHN_ORIGIN=https://shop.minjie0326.com

注意：MERCHANT_CODE 和 SUPABASE_SERVICE_ROLE_KEY 已經存在，不需要新增。

## 3. 建立 lib/webauthn.ts

這是 client-side 工具函式，用於偵測 WebAuthn 支援和 LINE In-App Browser。

功能：
- isLineInAppBrowser(): 檢查 User-Agent 含 'line/' 或 'liff'
- isWebAuthnSupported(): 檢查 WebAuthn API + 平台驗證器可用
- isConditionalUISupported(): 檢查 Conditional UI（autofill passkey）
- guessDeviceName(): 從 User-Agent 推斷裝置名稱

具體實作參考 SDD Section 6.3（WebAuthn_Passkey_SDD_v1_0.md）。
所有函式加 'use client' 或只在 client component 中 import。

## 驗收

- npm ls @simplewebauthn/server → 有版本號
- npm ls @simplewebauthn/browser → 有版本號  
- lib/webauthn.ts 存在且 TypeScript 無錯誤
- npm run build 通過
```

---

## Step 2：Registration API（2 支）

```
繼續在 Storefront 專案。建立 Passkey 註冊 API。

## 現有架構 — 必讀

先讀取以下檔案了解現有認證架構：
- lib/auth.ts（session 管理、密碼 hash、getSession 函式）
- lib/supabase.ts（Supabase client）
- app/api/auth/line/session/route.ts（session 檢查邏輯 — 用這個作為認證範本）

## 需建立的檔案

### app/api/auth/passkey/register/options/route.ts

POST — 生成 Registration Options

邏輯：
1. 從 cookie 取 session（用現有 lib/auth.ts 的 getSession 或同等方式），未登入 → 401
2. 取得 customer_id, display_name, email
3. 用 supabase service_role 查 webauthn_credentials：
   WHERE merchant_code = process.env.MERCHANT_CODE 
   AND user_type = 'customer' 
   AND user_id = customer_id 
   AND is_active = true
4. 用 @simplewebauthn/server 的 generateRegistrationOptions：
   - rpName: process.env.WEBAUTHN_RP_NAME
   - rpID: process.env.WEBAUTHN_RP_ID
   - userName: email 或 customer_id
   - userDisplayName: display_name
   - attestationType: 'none'
   - authenticatorSelection: { residentKey: 'preferred', userVerification: 'required', authenticatorAttachment: 'platform' }
   - excludeCredentials: 已有的 credentials（防重複註冊同裝置）
   - timeout: 300000
5. 將 challenge 寫入 webauthn_challenges：
   - challenge: options.challenge
   - user_type: 'customer'
   - user_id: customer_id
   - ceremony_type: 'registration'
   - rp_id: process.env.WEBAUTHN_RP_ID
   - expires_at: NOW() + 5 minutes
6. 回傳 { options }

### app/api/auth/passkey/register/verify/route.ts

POST — 驗證 Registration Response

Request body: { response: RegistrationResponseJSON, deviceName?: string }

邏輯：
1. 從 cookie 取 session，未登入 → 401
2. 從 webauthn_challenges 查找 challenge：
   WHERE ceremony_type = 'registration' 
   AND user_type = 'customer' 
   AND user_id = customer_id
   AND expires_at > NOW()
   ORDER BY created_at DESC LIMIT 1
3. 用 @simplewebauthn/server 的 verifyRegistrationResponse 驗證
   - expectedChallenge: 從 DB 取的 challenge
   - expectedOrigin: process.env.WEBAUTHN_ORIGIN
   - expectedRPID: process.env.WEBAUTHN_RP_ID
4. 驗證通過 → 刪除 webauthn_challenges 中的該筆
5. 寫入 webauthn_credentials：
   - merchant_code: process.env.MERCHANT_CODE
   - user_type: 'customer'
   - user_id: customer_id
   - credential_id: verification.registrationInfo.credential.id（base64url）
   - public_key: verification.registrationInfo.credential.publicKey（Buffer）
   - counter: verification.registrationInfo.credential.counter
   - device_name: request body 的 deviceName 或從 User-Agent 推斷
   - device_type: 'platform'
   - transports: verification.registrationInfo.credential.transports（JSON）
   - rp_id: process.env.WEBAUTHN_RP_ID
6. 回傳 { success: true, credential: { id, deviceName, createdAt } }
7. 驗證失敗 → 400 + 錯誤訊息

## 重要注意

- Supabase 用 service_role key（不是 anon key）
- public_key 是 Uint8Array，存 DB 時用 Buffer.from() 轉成 BYTEA
- credential_id 要用 base64url 字串存（@simplewebauthn 已處理）
- 所有錯誤 try-catch，不要洩漏內部錯誤

## 驗收

- npm run build 通過
- 兩支 API route 存在且無 TypeScript 錯誤
```

---

## Step 3：Authentication API（2 支）

```
繼續在 Storefront 專案。建立 Passkey 登入 API。

## 需建立的檔案

### app/api/auth/passkey/authenticate/options/route.ts

POST — 生成 Authentication Options（不需登入）

邏輯：
1. 不需 session 檢查（這是登入用的）
2. 用 @simplewebauthn/server 的 generateAuthenticationOptions：
   - rpID: process.env.WEBAUTHN_RP_ID
   - userVerification: 'required'
   - timeout: 300000
   - allowCredentials: 留空（discoverable credential）
3. 將 challenge 寫入 webauthn_challenges：
   - ceremony_type: 'authentication'
   - user_type: null
   - user_id: null
   - rp_id: process.env.WEBAUTHN_RP_ID
   - expires_at: NOW() + 5 minutes
4. 回傳 { options }

### app/api/auth/passkey/authenticate/verify/route.ts

POST — 驗證 Authentication + 建立 Session

Request body: { response: AuthenticationResponseJSON }

邏輯：
1. 從 response 取出 credential id
2. 查 webauthn_credentials：
   WHERE credential_id = [response 的 credential id]
   AND merchant_code = process.env.MERCHANT_CODE
   AND is_active = true
   → 找不到 → 404
3. 從 webauthn_challenges 查最新的 authentication challenge：
   WHERE ceremony_type = 'authentication'
   AND rp_id = process.env.WEBAUTHN_RP_ID
   AND expires_at > NOW()
   ORDER BY created_at DESC LIMIT 1
   → 找不到或過期 → 400
4. 用 @simplewebauthn/server 的 verifyAuthenticationResponse：
   - expectedChallenge
   - expectedOrigin: process.env.WEBAUTHN_ORIGIN
   - expectedRPID: process.env.WEBAUTHN_RP_ID
   - credential: { id, publicKey（從DB的BYTEA轉Uint8Array）, counter }
5. 驗證通過 → 刪除 challenge
6. 更新 webauthn_credentials：counter = 新 counter, last_used_at = NOW(), updated_at = NOW()
7. 根據 credential 的 user_type 和 user_id 查用戶資料：
   - user_type = 'customer' → 查 email_users 或 customer_line_profiles（WHERE customer_id = user_id AND merchant_code = MERCHANT_CODE）
   - 取得 customer_id, display_name, email, line_user_id（如有）
8. 建立 session — 用現有 lib/auth.ts 的 session 建立邏輯：
   - 設定 line_session cookie（跟 LINE OAuth callback 和 Email login 一樣的格式）
   - session 內容加 auth_method: 'passkey'
   - ⚠️ 這是最關鍵的一步：先讀 app/api/auth/line/callback/route.ts 和 app/api/auth/email/login/route.ts 看它們怎麼設 cookie，完全照做
9. 回傳 { success: true, user: { customer_id, display_name, email, auth_method: 'passkey' } }

## 重要

- 先讀懂現有的 session cookie 設定方式再寫。一定要跟現有格式一致，否則 middleware 會認不出。
- public_key 從 DB 取出是 Buffer（BYTEA），要轉成 Uint8Array 給 verifyAuthenticationResponse
- counter 驗證：如果 DB counter > 0 且 response counter <= DB counter → 可能是 clone，拒絕（但 counter = 0 時有些裝置不遞增，要容忍）

## 驗收

- npm run build 通過
- 四支 Passkey API route 全部存在
```

---

## Step 4：Credentials 管理 API（2 支）

```
繼續在 Storefront 專案。建立 Passkey 管理 API。

### app/api/auth/passkey/credentials/route.ts

GET — 列出當前用戶的所有 Passkey

邏輯：
1. 從 session 取 customer_id，未登入 → 401
2. 查 webauthn_credentials WHERE merchant_code AND user_type='customer' AND user_id=customer_id AND is_active=true
3. 回傳 credentials 陣列（id, device_name, device_type, last_used_at, created_at）
4. 不回傳 public_key、credential_id 等敏感欄位

### app/api/auth/passkey/credentials/[id]/route.ts

DELETE — 刪除指定 Passkey

邏輯：
1. 從 session 取 customer_id，未登入 → 401
2. 查 webauthn_credentials WHERE id = params.id AND user_type='customer' AND user_id=customer_id
   → 不存在或不是本人的 → 404
3. 軟刪除：UPDATE is_active = false, updated_at = NOW()
4. 回傳 { success: true }

## 驗收

- npm run build 通過
- 共 6 支 Passkey API route
- git add . && git commit -m "feat: WebAuthn/Passkey 6 API routes"
```

---

## Step 5：登入頁整合

```
繼續在 Storefront 專案。在登入頁加入 Passkey 快速登入。

## 先讀現有檔案

讀取 app/(website)/login/ 下的所有檔案，了解現有登入頁結構。
特別注意：
- LoginClient.tsx 或對應的 client component
- 現有的 LINE 登入按鈕和 Email 登入表單
- 品牌風格：黑金色系（#0a0a0a 背景, #D4AF37 金色, #06C755 LINE 綠）

## 建立 components/auth/PasskeyLoginButton.tsx

'use client' component

功能：
1. 元件 mount 時呼叫 isWebAuthnSupported()（from lib/webauthn.ts）
2. 不支援 → render null（不顯示任何東西）
3. 支援 → 顯示「快速登入」按鈕
4. 按鈕樣式：金色邊框 + 指紋/臉部圖示 + 文字「Face ID / 指紋登入」
5. 點擊流程：
   a. fetch POST /api/auth/passkey/authenticate/options
   b. 用 @simplewebauthn/browser 的 startAuthentication(options)
   c. 成功 → fetch POST /api/auth/passkey/authenticate/verify
   d. 驗證成功 → window.location.href = '/account'（或 referrer）
   e. 失敗 → 顯示錯誤提示（不用 toast，簡單的文字即可）
6. Loading 狀態：按鈕顯示 spinner
7. 錯誤處理：用戶取消生物辨識 → 不顯示錯誤（正常行為）

## 修改登入頁

在登入頁的 LINE 登入按鈕**上方**加入 PasskeyLoginButton：

```
[👤 Face ID / 指紋快速登入]   ← 新增（僅支援時顯示）
─────── 或 ────────
[🟢 LINE 快速登入]            ← 現有
─────── 或 ────────
Email + 密碼表單              ← 現有
```

分隔線樣式：跟現有的一致（灰色線 + 「或」文字）。

## LINE In-App Browser

PasskeyLoginButton 內部呼叫 isWebAuthnSupported() 時已包含 isLineInAppBrowser() 判斷。
LINE 內開啟 → isWebAuthnSupported() 回傳 false → 按鈕不渲染。
不需要額外處理。

## 驗收

- npm run build 通過
- 在 Chrome 開登入頁 → 應看到 Passkey 按鈕
- 用手機 LINE 開登入頁 → 不應看到 Passkey 按鈕
- git add . && git commit -m "feat: Passkey login button on login page"
```

---

## Step 6：會員中心整合

```
繼續在 Storefront 專案。在會員中心加入 Passkey 管理。

## 先讀現有檔案

讀取 app/(website)/account/ 下的所有檔案。
找到個人資料 / 帳號設定的位置。

## 建立 components/auth/PasskeyManager.tsx

'use client' component

功能：
1. mount 時 isWebAuthnSupported() → 不支援則 render null
2. fetch GET /api/auth/passkey/credentials 取得已有的 Passkey 列表
3. 顯示 UI（參考 SDD Section 6.5）：
   - 標題：「🔐 快速登入（Face ID / 指紋）」
   - 每個 Passkey 顯示：裝置名稱 + 上次使用時間 + [移除] 按鈕
   - [+ 新增裝置] 按鈕
   - 底部說明文字：「啟用後，下次可直接使用臉部辨識或指紋登入，不需要輸入密碼」
4. 新增裝置流程：
   a. fetch POST /api/auth/passkey/register/options
   b. startRegistration(options)
   c. fetch POST /api/auth/passkey/register/verify
   d. 成功 → 刷新列表 + 顯示成功訊息
5. 移除裝置：
   a. 確認 dialog（「確定要移除此裝置的快速登入？」）
   b. fetch DELETE /api/auth/passkey/credentials/{id}
   c. 成功 → 刷新列表
6. 風格：黑金色系，跟會員中心其他 section 一致

## 整合到會員中心

在個人資料頁底部（或安全設定 Tab，看現有結構）嵌入 <PasskeyManager />。
放在「會員等級」和「購物金」下方是合適的位置。

## 驗收

- npm run build 通過
- 會員中心可看到 Passkey 管理 UI（需在支援的瀏覽器）
- git add . && git commit -m "feat: Passkey manager in account settings"
```

---

## Step 7：Conditional UI（可選優化）

```
繼續在 Storefront 專案。加入 Conditional UI 支援。

這是可選優化：讓瀏覽器在 email 輸入框顯示 passkey autofill 提示。

## 修改登入頁

在登入頁 mount 時：
1. 呼叫 isConditionalUISupported()
2. 如果支援：
   a. 在 email input 加 autoComplete="username webauthn"
   b. 背景呼叫 startAuthentication({ useBrowserAutofill: true })
   c. 用戶如果在 autofill 選了 passkey → 觸發驗證流程 → 自動登入
   d. 用戶不選 → 正常輸入 email/password
3. 如果不支援 → 不做任何事

注意：Conditional UI 的 startAuthentication 會在背景等待，不能 await 阻塞（用 .then/.catch）。
如果用戶手動點了 PasskeyLoginButton，要取消背景的 conditional mediation（AbortController）。

這步如果太複雜可以跳過，Phase 3 再做。

## 驗收

- npm run build 通過
- git add . && git commit -m "feat: Conditional UI for passkey autofill"
```

---

## Step 8：最終測試 + 部署

```
## 測試清單

在本地 dev server (npm run dev) 測試以下項目：

1. 登入頁：
   - Chrome 打開 → 應看到 Passkey 按鈕
   - 點擊 Passkey 按鈕 → 應觸發生物辨識提示（localhost 下可能需要 HTTPS）
   
2. 會員中心（先用 LINE 或 Email 登入）：
   - 應看到 Passkey 管理區塊
   - 點「新增裝置」→ 應觸發生物辨識
   
3. API 測試：
   - 未登入呼叫 register/options → 應 401
   - 未登入呼叫 credentials → 應 401
   - authenticate/options → 應 200（不需登入）

## 環境變數（Vercel）

在 Vercel Dashboard 的 Storefront 專案設定以下環境變數：
- WEBAUTHN_RP_ID = minjie0326.com
- WEBAUTHN_RP_NAME = MINJIE STUDIO
- WEBAUTHN_ORIGIN = https://shop.minjie0326.com

## 部署

git push origin main
# 或
npx vercel --prod

## 部署後驗證

1. 開 https://shop.minjie0326.com/login → 確認 Passkey 按鈕出現
2. 用手機 LINE 開 → 確認 Passkey 按鈕不出現
3. 登入後到會員中心 → 確認 Passkey 管理區塊出現
```

---

## 通用規則提醒

1. **先讀現有代碼再寫新的** — 特別是 lib/auth.ts 的 session 機制和 cookie 格式
2. **TypeScript strict** — 不用 any，定義完整型別
3. **Supabase 用 service_role** — 所有 WebAuthn 表的 RLS 不允許 anon 存取
4. **merchant_code** — 所有 query 加 `WHERE merchant_code = process.env.MERCHANT_CODE`
5. **寫入時帶 merchant_code** — INSERT 時一律帶 `merchant_code: process.env.MERCHANT_CODE`
6. **RP ID 從 env 讀** — 不硬編碼
7. **challenge 用後即刪** — 驗證完立刻 DELETE
8. **錯誤不洩漏** — catch 後回 generic error message，console.error 記詳細資訊
9. **每步 commit** — 完成一個 Step 就 commit，方便回退
10. **中文 UI** — 所有面向用戶的文字用繁體中文
