# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

No test framework is configured.

## Architecture

This is a **headless e-commerce storefront** built with Next.js 14 (App Router) that connects to:
- **Medusa v2.x** - Product catalog and cart management
- **ECPay Gateway** - Payment processing and logistics (Taiwan-focused)

### Key Directories

- `app/` - Next.js pages using App Router
- `components/` - React components (CartProvider manages global cart state via Context API)
- `lib/` - API clients and utilities
  - `medusa.ts` - Medusa API client (products, cart operations)
  - `gateway.ts` - ECPay payment/logistics client
  - `config.ts` - Configuration loader with typed `StoreConfig` interface
- `config/store.json` - **Single configuration file** for all store settings

### Page Rendering Strategy

- Homepage (`app/page.tsx`): Server-side with ISR (1-hour revalidation)
- Product pages (`app/products/[handle]/`): Static generation via `generateStaticParams()`
- Checkout (`app/checkout/`): Client-side only (`'use client'`)

### State Management

Cart state uses React Context (`CartProvider.tsx`) with localStorage persistence (`medusa_cart_id` key). The cart auto-initializes on app load.

### Styling

Tailwind CSS with CSS variables for theming. Theme colors are injected at runtime in the root layout from `config/store.json`. Custom component classes (`.btn`, `.input`, `.card`, etc.) are defined in `styles/globals.css`.

## Configuration

All customization happens in `config/store.json`:
- Store info (name, domain, logo)
- Theme colors (primary, secondary, accent)
- Medusa connection (backendUrl, publishableKey, regionId, salesChannelId)
- ECPay gateway credentials
- Feature flags (cart, checkout, cvsLogistics, homeDelivery)
- Shipping config (free threshold, CVS/home delivery fees)

Store assets (logo, favicon) go in `public/tenant/`.

## Auth System (Email + LINE Login)

Two authentication paths, both stored in Supabase:
- `app/api/auth/email/` — Email registration with OTP verification, forgot/reset password
- `app/api/auth/line/` — LINE Login via OAuth, callback handles member binding
- `app/api/auth/logout/` — Unified logout
- Session managed via cookies, verified by Supabase JWT

### Member System

- `app/api/member/profile/` — Member profile CRUD
- `app/api/member/orders/` — Order history (from Medusa)
- `app/api/member/tier/` — Membership tier (from Supabase)
- `app/api/member/wallet/` — Wallet/points balance
- `app/(website)/account/` — Member center UI (AccountClient.tsx)

### LIFF Integration

- `app/(liff)/liff/` — LINE Front-end Framework pages
- Used for in-LINE-app checkout and member binding flows

### API Routes Overview

| Route | Purpose |
|-------|---------|
| `api/auth/*` | Email + LINE authentication |
| `api/cart/*` | Cart operations (via Medusa) |
| `api/categories/*` | Category CRUD with auto-revalidation |
| `api/member/*` | Member profile, orders, tier, wallet |
| `api/order/*` | Order creation and management |
| `api/order-extension/*` | Order extensions (custom fields) |
| `api/payment/*` | Payment processing |
| `api/search/*` | Product search |
| `api/wallet/*` | Wallet operations |
| `api/revalidate/*` | ISR cache revalidation |
| `api/liff/*` | LIFF-specific endpoints |

## External Dependencies

| Service | Purpose | Config Location |
|---------|---------|----------------|
| Medusa v2.x | Product catalog, cart, orders | `MEDUSA_BACKEND_URL`, `config/store.json` |
| Supabase | Auth, member data, DB | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` |
| LINE Login | OAuth login | `LINE_LOGIN_CHANNEL_ID`, `LINE_LOGIN_CHANNEL_SECRET` |
| ECPay Gateway | Payment + logistics | `config/store.json` ecpay section |
| Resend | Transactional email (OTP) | `RESEND_API_KEY` |

## Taiwan-Specific Features

- CVS logistics integration (7-ELEVEN, FamilyMart, Hi-Life)
- CVS store picker uses popup window with polling for selection
- Currency: TWD with `Intl.NumberFormat` formatting
- Primary language: Traditional Chinese (zh-TW)

## Key Rules

- 價格/金額永遠從 DB 取，不信任前端
- API 必含輸入驗證
- LINE webhook 需簽名驗證
- CORS 限制已設定在 Next.js config

## 設計系統（2026-02-20 新增）

### 文件位置
- 完整規格：docs/Storefront_Design_System_SDD_v1_0.md
- 執行步驟：docs/Storefront_Design_System_Instructions.md
- 設計範本索引：docs/Design_Reference_Index.md
- 視覺設計稿：docs/designs/*.jsx（10 個互動式範本，僅供參考不可直接 import）

### 核心架構
- PageRenderer 依 Layout JSON 渲染頁面，Component Registry 映射版型到元件
- AnimatedSection 包裝所有區塊，動畫參數從 MotionTheme 讀取，不寫死數值
- 13 種版型元件放在 components/website/sections/
- 降維特效元件放在 components/website/effects/
- 動畫主題配置放在 lib/motion/

### 開發規則
- LIFF 頁面不載入 framer-motion
- 只動 transform + opacity，永不動 layout 屬性
- 每個元件做完就 npm run build 驗證
- 圖片用 Next/Image + sizes，Hero 區加 priority
- 手機版 hover 效果要 disable
- 現有的資料讀取邏輯（getBanner, getSection 等）保留，不重寫
```
