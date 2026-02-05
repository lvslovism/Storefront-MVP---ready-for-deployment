# Storefront Template

電商前端模板，使用 Medusa 作為後端、ECPay Gateway 處理金流物流。

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定 `config/store.json`

修改以下設定：

```json
{
  "store": {
    "name": "你的商店名稱",
    "domain": "shop.yourdomain.com"
  },
  "medusa": {
    "backendUrl": "你的 Medusa URL",
    "publishableKey": "你的 Publishable Key",
    "regionId": "你的 Region ID",
    "salesChannelId": "你的 Sales Channel ID"
  },
  "gateway": {
    "url": "你的 Gateway URL",
    "apiKey": "你的 API Key"
  }
}
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

### 4. 部署到 Vercel

```bash
vercel --prod
```

## 目錄結構

```
├── config/
│   └── store.json           # 商店設定（唯一需要修改的檔案）
├── public/
│   └── tenant/              # 商店資源（Logo、Favicon）
├── app/                     # Next.js 頁面
├── components/              # React 元件
├── lib/                     # 工具函式
└── styles/                  # 全域樣式
```

## 客製化指南

### 修改主題顏色

編輯 `config/store.json` 的 `theme` 區塊：

```json
{
  "theme": {
    "primaryColor": "#000000",
    "accentColor": "#dc2626"
  }
}
```

### 更換 Logo

1. 將 Logo 放到 `public/tenant/logo.png`
2. 更新 `config/store.json` 的 `store.logo` 路徑

### 啟用/停用功能

```json
{
  "features": {
    "cart": true,
    "checkout": true,
    "cvsLogistics": true,
    "homeDelivery": true
  }
}
```

## 技術棧

- **框架**: Next.js 14 (App Router)
- **樣式**: Tailwind CSS
- **後端**: Medusa v2.x
- **金流**: ECPay Gateway

## License

MIT
