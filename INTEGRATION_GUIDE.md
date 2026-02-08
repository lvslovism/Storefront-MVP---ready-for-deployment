# 結帳頁購物金折抵 — 整合指引

## 新增檔案（直接放入專案）
- `app/api/wallet/balance/route.ts` — 查詢餘額 API
- `app/api/wallet/deduct/route.ts` — 扣款 API  
- `components/checkout/CreditsSelector.tsx` — 購物金 UI 組件

## 修改 app/checkout/page.tsx

### Step 1: 新增 import
在檔案頂部加入：
```tsx
import CreditsSelector from '@/components/checkout/CreditsSelector'
```

### Step 2: 新增 state
在現有的 state 區域（約第 50-70 行）加入：
```tsx
const [creditsToUse, setCreditsToUse] = useState(0);
```

### Step 3: 修改 total 計算（約第 72 行）
原本：
```tsx
const total = subtotal + shippingFee;
```
改成：
```tsx
const total = subtotal - creditsToUse + shippingFee;
```

### Step 4: handleSubmit 帶上購物金資訊
在 createCheckout 的 metadata 裡加入：
```tsx
metadata: {
  cart_id: cart.id,
  shipping_method: shippingMethod,
  shipping_fee: shippingFee,
  credits_used: creditsToUse,  // ← 新增
  // ... 其餘不變
}
```

### Step 5: 在訂單摘要區域插入 CreditsSelector
找到訂單摘要的位置（顯示小計、運費、總計的地方），在「小計」和「運費」之間或「運費」和「總計」之間插入：

```tsx
<CreditsSelector
  customerId={cart?.customer_id || null}
  subtotal={subtotal}
  onCreditsChange={setCreditsToUse}
/>
```

### Step 6: 訂單摘要顯示折抵金額
在總計行之前加入購物金折抵行（只在有折抵時顯示）：
```tsx
{creditsToUse > 0 && (
  <div className="flex justify-between text-sm">
    <span style={{ color: '#D4AF37' }}>💰 購物金折抵</span>
    <span style={{ color: '#D4AF37' }}>-{formatPrice(creditsToUse)}</span>
  </div>
)}
```

## 環境變數（Vercel）
需要新增：
```
SUPABASE_URL=https://ephdzjkgpkuydpbkxnfw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的service_role_key
MERCHANT_CODE=default
```

注意：`NEXT_PUBLIC_SUPABASE_URL` 如果已存在就不用重複加。
`SUPABASE_SERVICE_ROLE_KEY` 是 server-side only，不要加 NEXT_PUBLIC_ 前綴。

## order-completed Edge Function 修改
在付款成功後的 order-completed Edge Function 裡，需要從訂單 metadata 讀取 credits_used，
然後呼叫扣款邏輯。但因為 ECPay 回調是打 Gateway → Medusa，
所以更簡單的方式是在 ECPay 回調成功後，由 Gateway 或 Medusa 觸發扣款。

### 推薦方式：在 order-completed Edge Function 裡加入扣款
在現有的積點發放邏輯之後，加入：

```typescript
// Step 6: 如果有使用購物金，扣除
const creditsUsed = order.metadata?.credits_used || 0
if (creditsUsed > 0 && wallet) {
  const deductBalance = wallet.balance - creditsUsed
  
  await supabase.from('wallet_transaction').insert({
    wallet_id: wallet.id,
    type: 'spend',
    amount: -creditsUsed,
    balance_after: deductBalance,
    reference_type: 'order',
    reference_id: order.id,
    description: `訂單 #${order.display_id} 購物金折抵`,
    source_type: 'order_payment'
  })

  await supabase.from('member_wallet').update({
    balance: deductBalance,
    total_spent: (wallet.total_spent || 0) + creditsUsed,
    updated_at: new Date().toISOString()
  }).eq('id', wallet.id)
  
  // 更新 wallet 變數供後續使用
  wallet.balance = deductBalance
}
```
