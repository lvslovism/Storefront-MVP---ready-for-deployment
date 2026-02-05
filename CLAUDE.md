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

## Taiwan-Specific Features

- CVS logistics integration (7-ELEVEN, FamilyMart, Hi-Life)
- CVS store picker uses popup window with polling for selection
- Currency: TWD with `Intl.NumberFormat` formatting
- Primary language: Traditional Chinese (zh-TW)
