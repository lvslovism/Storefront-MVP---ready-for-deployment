# MINJIE STUDIO 會員系統 — 施工執行清單

> 日期：2026-02-12  
> 狀態：待施工  
> 前提：所有 UI 設計稿已確認通過

---

## 已完成的設計稿

| 設計稿 | 內容 | 檔案 |
|--------|------|------|
| 登入頁 v2 | LINE 登入 + Email 註冊/登入 + 信箱 OTP 驗證 | `minjie-login-v2.jsx` |
| 會員中心 v2 | 4 Tab + 再買一次 + 常用地址/超商 + 偏好配送 | `minjie-account-v2.jsx` |
| 規劃文件 v2 | 整合安全文件後的完整架構規劃 | `MINJIE_Auth_Member_System_Plan_v2.md` |

---

## 第一步：檔案放到專案的哪裡

你的專案路徑是：
```
C:\Users\Hotten\Projects\Storefront-MVP---ready-for-deployment\
```

### 新建檔案清單

```
app/
├── (website)/
│   ├── login/
│   │   └── page.tsx              ← 由 minjie-login-v2.jsx 改寫
│   │
│   └── account/
│       ├── page.tsx              ← Server Component（檢查登入 → redirect）
│       └── AccountClient.tsx     ← 由 minjie-account-v2.jsx 改寫
│
├── api/
│   └── auth/
│       ├── logout/
│       │   └── route.ts          ← 新建：登出 API
│       └── email/
│           ├── register/
│           │   └── route.ts      ← 新建：Email 註冊
│           ├── verify/
│           │   └── route.ts      ← 新建：驗證 OTP
│           ├── login/
│           │   └── route.ts      ← 新建：Email 登入
│           ├── forgot-password/
│           │   └── route.ts      ← 新建：忘記密碼
│           ├── reset-password/
│           │   └── route.ts      ← 新建：重設密碼
│           └── resend-otp/
│               └── route.ts      ← 新建：重送驗證碼
│
├── api/
│   └── member/
│       ├── profile/
│       │   └── route.ts          ← 新建：個人資料 GET/PUT
│       ├── tier/
│       │   └── route.ts          ← 新建：會員等級 GET
│       ├── wallet/
│       │   └── route.ts          ← 新建：購物金 GET
│       ├── addresses/
│       │   └── route.ts          ← 新建：常用地址 CRUD
│       ├── cvs-stores/
│       │   └── route.ts          ← 新建：常用超商門市 CRUD
│       └── reorder/
│           └── route.ts          ← 新建：再買一次（加入購物車）

lib/
├── auth.ts                       ← 新建：認證工具函式（checkSession, hashPassword 等）
└── email.ts                      ← 新建：寄信服務（Resend / SendGrid）

components/
├── website/
│   └── UserMenu.tsx              ← 新建：Header 登入/登出狀態元件
└── account/
    ├── OrdersTab.tsx             ← 從 minjie-account-v2.jsx 拆出
    ├── TierTab.tsx               ← 從 minjie-account-v2.jsx 拆出
    ├── WalletTab.tsx             ← 從 minjie-account-v2.jsx 拆出
    └── ProfileTab.tsx            ← 從 minjie-account-v2.jsx 拆出
```

### 修改現有檔案

| 檔案 | 修改內容 |
|------|---------|
| `components/website/Header.tsx` | 將 `LineLoginButton` 替換為 `UserMenu` 元件 |
| `app/checkout/page.tsx` | 結帳時讀取會員偏好配送、常用地址/門市，自動帶入 |
| `lib/cms.ts` | 如需新增會員資料查詢函式可加在這裡（或用獨立 `lib/member.ts`） |

---

## 第二步：Supabase 執行 SQL

到 Supabase Dashboard → SQL Editor，依序執行：

### 2-1. 新建 Email 認證表

```sql
-- Email 認證用戶表
CREATE TABLE email_users (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID,
  merchant_code VARCHAR(50) DEFAULT 'minjie',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20),
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_email_users_email ON email_users(email);
CREATE INDEX idx_email_users_customer ON email_users(customer_id);

-- RLS
ALTER TABLE email_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON email_users
  FOR ALL USING (auth.role() = 'service_role');
```

### 2-2. 新建驗證碼表

```sql
CREATE TABLE email_verification_codes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(255) NOT NULL,
  code VARCHAR(6) NOT NULL,
  purpose VARCHAR(20) NOT NULL,       -- register / reset_password
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 5,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_verify_email ON email_verification_codes(email, purpose);

ALTER TABLE email_verification_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON email_verification_codes
  FOR ALL USING (auth.role() = 'service_role');
```

### 2-3. 新建常用地址表

```sql
CREATE TABLE customer_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  merchant_code VARCHAR(50) DEFAULT 'minjie',
  label VARCHAR(50),                   -- 住家 / 公司 / 自訂
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  zip_code VARCHAR(10),
  city VARCHAR(50),
  district VARCHAR(50),
  address TEXT NOT NULL,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_addr_customer ON customer_addresses(customer_id);

ALTER TABLE customer_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON customer_addresses
  FOR ALL USING (auth.role() = 'service_role');
```

### 2-4. 新建常用超商門市表

```sql
CREATE TABLE customer_cvs_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL,
  merchant_code VARCHAR(50) DEFAULT 'minjie',
  cvs_type VARCHAR(20) NOT NULL,       -- UNIMARTC2C / FAMIC2C / HILIFEC2C
  store_id VARCHAR(20) NOT NULL,
  store_name VARCHAR(100) NOT NULL,
  address TEXT,
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cvs_customer ON customer_cvs_stores(customer_id);

ALTER TABLE customer_cvs_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON customer_cvs_stores
  FOR ALL USING (auth.role() = 'service_role');
```

### 2-5. 新建偏好設定表

```sql
CREATE TABLE customer_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id VARCHAR(255) NOT NULL UNIQUE,
  merchant_code VARCHAR(50) DEFAULT 'minjie',
  preferred_shipping VARCHAR(20),      -- cvs / home / null
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE customer_preferences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service_role_only" ON customer_preferences
  FOR ALL USING (auth.role() = 'service_role');
```

---

## 第三步：安裝套件

```bash
# 密碼 hash
npm install bcryptjs
npm install -D @types/bcryptjs

# 寄信服務（擇一）
npm install resend          # 推薦，免費 3,000 封/月

# LIFF SDK（如果還沒裝的話）
npm install @line/liff
```

---

## 第四步：環境變數

在 Vercel Dashboard → Settings → Environment Variables 新增：

```env
# 寄信服務（Resend）
RESEND_API_KEY=re_xxxxxxxxx

# 如果用 SendGrid
# SENDGRID_API_KEY=SG.xxxxxxxxx
```

現有的這些變數不需要改（已存在）：

```env
NEXT_PUBLIC_LIFF_ID=（已有）
NEXT_PUBLIC_SUPABASE_URL=（已有）
NEXT_PUBLIC_SUPABASE_ANON_KEY=（已有）
SUPABASE_SERVICE_ROLE_KEY=（已有）
```

---

## 第五步：施工順序

| 順序 | 工作 | 預估時間 | 依賴 |
|:----:|------|:-------:|------|
| ① | Supabase 執行 5 段 SQL | 10 分鐘 | 無 |
| ② | 安裝 npm 套件 | 5 分鐘 | 無 |
| ③ | 建 `lib/auth.ts`（session 工具） | 30 分鐘 | 無 |
| ④ | 建 `POST /api/auth/logout`（Phase 0） | 30 分鐘 | ③ |
| ⑤ | 建 `UserMenu` 元件 + 改 Header | 1 小時 | ④ |
| ⑥ | 建 `/login` 頁面（轉 TSX + 接 LIFF） | 2 小時 | ③ |
| ⑦ | 建 Email 認證 API（6 支 route） | 3 小時 | ③ + 寄信服務 |
| ⑧ | 建 `/account` 頁面（轉 TSX + 4 Tab） | 2 小時 | ③ |
| ⑨ | 建 member API（profile/tier/wallet） | 2 小時 | ③ |
| ⑩ | 建 addresses/cvs-stores API | 1.5 小時 | ③ |
| ⑪ | 建 reorder API（再買一次） | 1 小時 | ③ |
| ⑫ | 改 checkout 串接偏好/地址 | 2 小時 | ⑩ |
| ⑬ | 測試 + 修 bug | 2 小時 | 全部 |

**總計約 16-17 小時（3-4 個工作天）**

---

## JSX → TSX 轉換注意事項

設計稿是純 React JSX，轉成 Next.js 實際頁面時要注意：

1. **拆分 Client / Server** — `page.tsx` 是 Server Component，負責檢查 session + redirect。互動 UI 放在 `AccountClient.tsx`，加 `'use client'` 宣告。

2. **移除 inline style** — 設計稿用 inline style 方便預覽，實際開發時改成 Tailwind class 配合現有風格系統（`gold-text`、`btn-gold` 等）。

3. **Mock data → API fetch** — 所有 `MOCK_*` 常數替換成 `useEffect` + `fetch('/api/member/...')` 或 Server Component 直接查 Supabase。

4. **LIFF SDK 初始化** — 登入頁需要在 `useEffect` 裡做：
```typescript
import liff from '@line/liff';

useEffect(() => {
  liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
}, []);

const handleLineLogin = () => {
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
  }
};
```

5. **保護路由** — `/account` 頁面的 Server Component：
```typescript
// app/(website)/account/page.tsx
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import AccountClient from './AccountClient';

export default async function AccountPage() {
  const cookieStore = cookies();
  const session = cookieStore.get('session'); // 實際 cookie name 以 codebase 為準
  
  if (!session) {
    redirect('/login?redirect=/account');
  }
  
  return <AccountClient />;
}
```

---

## 驗收 Checklist

### Phase 0（登出）
- [ ] Header 未登入 → 顯示「登入」按鈕
- [ ] Header 已登入 → 顯示使用者名稱 + 下拉選單
- [ ] 下拉選單有「我的帳號」「登出」
- [ ] 點擊登出 → 清除 cookie → 回首頁 → Header 回到未登入狀態
- [ ] 重新整理後維持登出狀態

### Phase 1A（登入頁）
- [ ] `/login` 頁面正常顯示
- [ ] LINE 登入按鈕觸發 `liff.login()`
- [ ] Email 註冊 → 填表 → 送出 → OTP 輸入畫面
- [ ] OTP 6 位輸入框可自動跳格、支援貼上
- [ ] 60 秒倒數重送
- [ ] 驗證成功 → 設 cookie → 跳轉（支援 `?redirect=` 參數）
- [ ] Email 登入 → 帳號密碼 → 登入成功
- [ ] 忘記密碼 → 寄送重設信

### Phase 1B（會員中心）
- [ ] 未登入訪問 `/account` → 跳轉 `/login?redirect=/account`
- [ ] 訂單紀錄 Tab → 顯示歷史訂單
- [ ] 「再買一次」按鈕 → 商品加入購物車
- [ ] 會員等級 Tab → 等級卡 + 升等進度 + 權益
- [ ] 購物金 Tab → 餘額 + 交易紀錄
- [ ] 個人資料 Tab → 可編輯姓名/電話/生日
- [ ] 偏好配送方式可切換 + 儲存
- [ ] 常用地址 CRUD（新增/編輯/刪除/設預設）
- [ ] 常用超商門市 CRUD
- [ ] 儲存按鈕有 toast 回饋

### 快速結帳整合
- [ ] 結帳頁自動帶入偏好配送方式
- [ ] 選超商 → 自動帶入預設門市
- [ ] 選宅配 → 自動帶入預設地址
- [ ] 結帳時選的新門市 → 自動存入常用門市

---

*本文件配合 `MINJIE_Auth_Member_System_Plan_v2.md` 和 `Auth_Security_Technical_Guide_v1_0.docx` 使用。*
