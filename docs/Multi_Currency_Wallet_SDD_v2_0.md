# MINJIE STUDIO — 多幣種錢包系統 SDD v2.0

> 版本：v2.0（取代 Multi_Currency_Wallet_SDD_v1_0.md）  
> 日期：2026-02-16  
> 狀態：待實作  
> 前置文件：`Multi_Currency_Wallet_SDD_v1_0.md`、`MINJIE_Member_System_v1_2_SDD.md`  
> 變更摘要：等級體系對齊 ktai 舊系統、購物金規則統一化、折抵邏輯重設計（合併顯示 + FIFO 扣款）

---

## 一、變更總覽

### 1.1 本次修訂解決的問題

| # | 問題 | 影響 |
|---|------|------|
| 1 | 等級 code `elite` 與舊系統 `premium` 不一致 | member_tier 已有 ~17 筆 elite，需改名 |
| 2 | CMS 顯示名稱（白金/菁英/至善）與業務定義不符 | 客戶看到錯誤等級名稱 |
| 3 | 購物金規則 SDD v1 設計為分等級差異化（1%~5%） | 實際業務需求為全等級統一 1% |
| 4 | 折抵邏輯設計為三錢包各自獨立操作 | 業務需求為合計上限 10%，用戶調一個總額 |
| 5 | 結帳頁沒有折抵 UI | CreditsSelector 未整合進結帳頁 |
| 6 | 缺少退款回錢包邏輯 | 電商基本功能缺失 |
| 7 | 缺少併發扣款保護 | 同客戶雙設備結帳可能超扣 |

### 1.2 工作包

| # | 項目 | 優先級 | 預估 | 依賴 |
|---|------|--------|------|------|
| W1 | SQL Migration — 等級體系對齊 | 🔴 P0 | 0.5 天 | 無 |
| W2 | SQL Migration — 購物金規則統一化 | 🔴 P0 | 0.5 天 | W1 |
| W3 | API 重寫 — balance + deduct | 🔴 P0 | 1 天 | W2 |
| W4 | 前端 — CreditsSelector v2 + 結帳頁整合 | 🔴 P0 | 1 天 | W3 |
| W5 | 退款回錢包邏輯 | 🔴 P0 | 0.5 天 | W3 |
| W6 | 併發扣款保護 | 🔴 P0 | 0.5 天 | W3 |
| W7 | CMS 等級顯示名稱修正 | 🟡 P1 | 0.5 天 | W1 |
| W8 | CMS 手動發放 / 調整購物金 | 🟡 P1 | 0.5 天 | W3 |
| W9 | 到期提醒 LINE 推播 | 🟡 P1 | 0.5 天 | W3 |
| W10 | 每日對帳快照 + 月報表 | 🟢 P2 | 0.5 天 | W2 |
| W11 | 審計欄位補充 | 🟢 P2 | 0.5 天 | W3 |

**P0 合計：4 天 ｜ P1 合計：1.5 天 ｜ P2 合計：1 天**

---

## 二、W1 — 等級體系對齊

### 2.1 最終等級定義

| tier_code | tier_name | tier_order | min_spent | monthly_quota | birthday_bonus | cashback_rate |
|-----------|-----------|------------|-----------|---------------|----------------|---------------|
| silver | 白銀會員 | 1 | $0 | $0 | $100 | 1% |
| gold | 黃金會員 | 2 | $6,888 | $100 | $200 | 1% |
| platinum | 鉑金會員 | 3 | $16,888 | $150 | $400 | 1% |
| diamond | 鑽石會員 | 4 | $38,888 | $220 | $800 | 1% |
| premium | 頂級會員 | 5 | $68,888 | $380 | $1,500 | 1% |
| throne | 王座會員 | 6 | $128,888 | $450 | $2,000 | 1% |

### 2.2 SQL Migration

```sql
-- ============================================
-- W1: 等級體系對齊 ktai 舊系統
-- 執行前請備份：pg_dump -t tier_config -t member_tier
-- ============================================

-- Step 1: 更新 tier_config（先改 elite → premium）
UPDATE tier_config 
SET tier_level = 'premium', tier_name = '頂級會員'
WHERE tier_level = 'elite' AND merchant_code = 'minjie';

-- Step 2: 確認所有 tier_name 對齊
UPDATE tier_config SET tier_name = '白銀會員' WHERE tier_level = 'silver' AND merchant_code = 'minjie';
UPDATE tier_config SET tier_name = '黃金會員' WHERE tier_level = 'gold' AND merchant_code = 'minjie';
UPDATE tier_config SET tier_name = '鉑金會員' WHERE tier_level = 'platinum' AND merchant_code = 'minjie';
UPDATE tier_config SET tier_name = '鑽石會員' WHERE tier_level = 'diamond' AND merchant_code = 'minjie';
UPDATE tier_config SET tier_name = '王座會員' WHERE tier_level = 'throne' AND merchant_code = 'minjie';

-- Step 3: 更新 member_tier 中所有 elite → premium
UPDATE member_tier 
SET tier_level = 'premium'
WHERE tier_level = 'elite' AND merchant_code = 'minjie';

-- Step 4: 修改 CHECK constraint
-- 先查出現有 constraint 名稱
-- SELECT constraint_name FROM information_schema.check_constraints 
-- WHERE constraint_name LIKE '%tier%';

ALTER TABLE member_tier DROP CONSTRAINT IF EXISTS member_tier_tier_level_check;
ALTER TABLE member_tier ADD CONSTRAINT member_tier_tier_level_check 
  CHECK (tier_level IN ('silver', 'gold', 'platinum', 'diamond', 'premium', 'throne'));

-- Step 5: 更新自動升等 function 中的等級順序
CREATE OR REPLACE FUNCTION fn_auto_upgrade_tier()
RETURNS TRIGGER AS $$
DECLARE
  v_new_tier VARCHAR(50);
  v_tier_order TEXT[] := ARRAY['silver','gold','platinum','diamond','premium','throne'];
  v_current_idx INT;
  v_new_idx INT;
BEGIN
  IF NEW.total_spent IS NOT DISTINCT FROM OLD.total_spent THEN
    RETURN NEW;
  END IF;

  SELECT tc.tier_level INTO v_new_tier
  FROM tier_config tc
  WHERE tc.merchant_code = NEW.merchant_code
    AND tc.min_spent <= NEW.total_spent
  ORDER BY tc.min_spent DESC
  LIMIT 1;

  IF v_new_tier IS NULL THEN
    RETURN NEW;
  END IF;

  v_current_idx := array_position(v_tier_order, NEW.tier_level);
  v_new_idx := array_position(v_tier_order, v_new_tier);

  IF v_current_idx IS NULL OR v_new_idx > v_current_idx THEN
    NEW.tier_level := v_new_tier;
    NEW.upgraded_at := NOW();
    
    SELECT tc.discount_rate INTO NEW.discount_rate
    FROM tier_config tc
    WHERE tc.merchant_code = NEW.merchant_code
      AND tc.tier_level = v_new_tier;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 6: 驗證
SELECT tier_level, tier_name, COUNT(*) 
FROM member_tier mt
JOIN tier_config tc USING (tier_level, merchant_code)
WHERE mt.merchant_code = 'minjie'
GROUP BY tier_level, tier_name
ORDER BY MIN(tc.min_spent);
-- 預期：不應出現 elite，premium 應有 ~17 筆
```

---

## 三、W2 — 購物金規則統一化

### 3.1 全局折抵設定

不再用 `wallet_type_config.tier_rules` 做分等級差異化。改為在 `merchant_settings` 新增統一的折抵規則。

```sql
-- ============================================
-- W2: 購物金規則統一化
-- ============================================

-- Step 1: 新增全局折抵設定到 merchant_settings
-- merchant_settings 已有 JSONB 欄位可存設定
UPDATE merchant_settings 
SET settings = settings || '{
  "wallet_rules": {
    "cashback_rate": 0.01,
    "cashback_expiry_days": 365,
    "cashback_min_order": 100,
    "cashback_max_per_order": 10000,
    "deduction_min_order": 1000,
    "deduction_max_pct": 0.10,
    "deduction_strategy": "fifo_expiry"
  }
}'::jsonb
WHERE merchant_code = 'minjie';

-- Step 2: 簡化 wallet_type_config
-- 保留三種幣種的基本資訊，移除分等級 tier_rules
UPDATE wallet_type_config 
SET tier_rules = '{
  "description": "全等級統一，規則存於 merchant_settings.wallet_rules",
  "points_to_dollar": 1
}'::jsonb
WHERE merchant_code = 'minjie' AND wallet_type = 'shopping_credit';

UPDATE wallet_type_config 
SET tier_rules = '{
  "description": "全等級統一，規則存於 merchant_settings.wallet_rules",
  "points_to_dollar": 1
}'::jsonb
WHERE merchant_code = 'minjie' AND wallet_type = 'points';

UPDATE wallet_type_config 
SET tier_rules = '{
  "description": "發放金額依等級，存於 tier_config.birthday_bonus",
  "points_to_dollar": 1
}'::jsonb
WHERE merchant_code = 'minjie' AND wallet_type = 'birthday';
```

### 3.2 統一規則速查

| 規則 | 值 | 說明 |
|------|-----|------|
| cashback_rate | 0.01 | 訂單回饋 1%（全等級統一） |
| cashback_expiry_days | 365 | 回饋購物金 365 天後過期 |
| cashback_min_order | 100 | 訂單 ≥ $100 才觸發回饋 |
| cashback_max_per_order | 10000 | 單筆回饋上限 $10,000 |
| deduction_min_order | 1000 | 訂單 ≥ $1,000 才能折抵 |
| deduction_max_pct | 0.10 | 折抵上限 = 訂單金額 × 10%（三種合計） |
| deduction_strategy | fifo_expiry | 按過期日升序（最快過期的先扣） |

---

## 四、W3 — API 重寫

### 4.1 GET /api/wallet/balance

**用途：** 結帳頁查詢可用折抵額度（合併顯示）+ 會員中心查詢明細

**Request：**
```
GET /api/wallet/balance?customer_id=cus_xxx&view=checkout|detail
```

**Response（view=checkout，結帳頁用）：**
```json
{
  "total_available": 670,
  "max_deduction": 399,
  "deduction_min_order": 1000,
  "deduction_max_pct": 0.10,
  "order_qualifies": true,
  "nearest_expiry": {
    "amount": 150,
    "date": "2026-03-15"
  },
  "breakdown": [
    { "wallet_type": "shopping_credit", "display_name": "購物金", "icon": "💰", "balance": 150 },
    { "wallet_type": "birthday", "display_name": "生日禮金", "icon": "🎂", "balance": 500 },
    { "wallet_type": "points", "display_name": "紅利點數", "icon": "⭐", "balance": 20 }
  ]
}
```

**Response（view=detail，會員中心用）：**
```json
{
  "total_available": 670,
  "wallets": [
    {
      "wallet_type": "shopping_credit",
      "display_name": "購物金",
      "icon": "💰",
      "balance": 150,
      "expiring_soon": [
        { "amount": 80, "expires_at": "2026-03-15" },
        { "amount": 70, "expires_at": "2026-04-20" }
      ]
    },
    {
      "wallet_type": "birthday",
      "display_name": "生日禮金",
      "icon": "🎂",
      "balance": 500,
      "expiring_soon": [
        { "amount": 500, "expires_at": "2026-06-01" }
      ]
    },
    {
      "wallet_type": "points",
      "display_name": "紅利點數",
      "icon": "⭐",
      "balance": 20,
      "expiring_soon": []
    }
  ],
  "recent_transactions": [
    {
      "date": "2026-02-15",
      "type": "earn",
      "amount": 40,
      "wallet_type": "shopping_credit",
      "description": "訂單回饋"
    }
  ]
}
```

**後端邏輯：**
```
1. 查 member_wallet WHERE customer_id（3 筆）
2. total_available = SUM(balance)
3. 查 merchant_settings.wallet_rules 取 deduction_min_order / deduction_max_pct
4. max_deduction = MIN(total_available, FLOOR(order_subtotal × deduction_max_pct))
5. order_qualifies = (order_subtotal >= deduction_min_order)
6. nearest_expiry = 查 wallet_transaction WHERE type='earn' AND expires_at > NOW() 
   ORDER BY expires_at ASC LIMIT 1，計算該筆剩餘可用金額
```

### 4.2 POST /api/wallet/deduct

**用途：** 結帳時扣款，只接收總額，後端 FIFO 自動分配

**Request：**
```json
{
  "customer_id": "cus_xxx",
  "order_id": "order_xxx",
  "amount": 300,
  "order_subtotal": 3990
}
```

**後端 FIFO 扣款邏輯：**

```
1. 驗證 order_subtotal >= deduction_min_order（$1,000）
2. 驗證 amount <= FLOOR(order_subtotal × deduction_max_pct)
3. 冪等檢查：wallet_transaction WHERE reference_type='order' AND reference_id=order_id AND type='spend'
4. 樂觀鎖：開始 transaction

5. 取所有未過期的 earn 記錄，按 expires_at ASC 排序：
   SELECT wt.id, wt.wallet_type, wt.amount AS earned,
          wt.expires_at,
          COALESCE(SUM(spent.amount), 0) AS already_spent
   FROM wallet_transaction wt
   LEFT JOIN wallet_transaction spent 
     ON spent.reference_type = 'fifo_consume'
     AND spent.reference_id = wt.id::text
   WHERE wt.wallet_id IN (SELECT id FROM member_wallet WHERE customer_id = ?)
     AND wt.type = 'earn'
     AND (wt.expires_at IS NULL OR wt.expires_at > NOW())
   GROUP BY wt.id
   HAVING wt.amount + COALESCE(SUM(spent.amount), 0) > 0
   ORDER BY wt.expires_at ASC NULLS LAST, wt.created_at ASC

6. 逐筆扣除直到 remaining = 0：
   for each earn_record:
     available = earned + already_spent  (already_spent 是負數)
     consume = MIN(available, remaining)
     
     INSERT wallet_transaction (
       wallet_id, wallet_type, type='spend',
       amount = -consume,
       balance_after = (計算),
       reference_type = 'order',
       reference_id = order_id,
       description = '訂單折抵'
     )
     
     remaining -= consume
     if remaining <= 0: break

7. 更新 member_wallet.balance（三個錢包各自 UPDATE）
   UPDATE member_wallet 
   SET balance = balance - {該錢包被扣的總額}
   WHERE customer_id = ? AND wallet_type = ?
   AND balance >= {該錢包被扣的總額}  ← 樂觀鎖：餘額不足則整個 transaction 回滾

8. 回傳分配明細
```

**Response：**
```json
{
  "success": true,
  "total_deducted": 300,
  "allocation": [
    { "wallet_type": "shopping_credit", "amount": 150, "detail": "80(3/15到期) + 70(4/20到期)" },
    { "wallet_type": "birthday", "amount": 130, "detail": "130(6/01到期)" },
    { "wallet_type": "points", "amount": 20, "detail": "20(永不過期)" }
  ]
}
```

### 4.3 FIFO 扣款簡化方案

上述 4.2 的 FIFO 追蹤單筆 earn 消耗較複雜。如果初期不需要精確到每筆 earn 的剩餘額，可用簡化版：

```
簡化版：不追蹤單筆 earn，只按錢包的 expires_at 最近者排序

1. 查三個錢包，按「最早過期餘額」排序
2. 優先扣最快過期的那個錢包
3. 扣完換下一個
4. wallet_transaction 只記 spend，不記 fifo_consume

優點：簡單、好維護
缺點：過期清理時無法精確知道「這筆 earn 還剩多少沒被用」
建議：Phase 1 用簡化版，Phase 2 再改精確版
```

---

## 五、W4 — 前端 CreditsSelector v2

### 5.1 結帳頁 UI

```
訂單摘要
────────────────────────────────
BEAUTEA | 天然果乾水  x5         $3,990
────────────────────────────────
商品小計                         $3,990
運費                              免運

🎁 折抵優惠
┌──────────────────────────────┐
│ 可用額度 $670                 │
│                               │
│ 使用折抵                      │
│ [$399              ] ← 輸入框 │
│ ○───────────●──── ← 滑桿     │
│ $0          $399（上限 10%）  │
│                               │
│ 💡 $150 將於 3/15 到期        │
└──────────────────────────────┘

折扣碼  [輸入折扣碼      ] [套用]

────────────────────────────────
折抵                            -$399
總計                            $3,591
────────────────────────────────
        [ 前往付款 ]
```

### 5.2 UI 規則

| 規則 | 說明 |
|------|------|
| 訂單 < $1,000 | 整個折抵區塊不顯示 |
| 餘額 = 0 | 整個折抵區塊不顯示 |
| 未登入 | 不顯示，或顯示「登入後可使用折抵」 |
| 輸入值 > 上限 | 自動回到上限值，不顯示紅字錯誤 |
| 到期提醒 | 7 天內有到期的額度才顯示 |
| 金額格式 | 整數、無小數、千分位逗號 |

### 5.3 CreditsSelector v2 Props

```typescript
interface CreditsSelectorV2Props {
  customerId: string | null;
  orderSubtotal: number;
  onCreditsChange: (amount: number) => void;
}
```

### 5.4 結帳頁整合修改

```typescript
// app/checkout/page.tsx 修改點

// 1. import
import CreditsSelectorV2 from '@/components/checkout/CreditsSelectorV2'

// 2. state
const [creditsToUse, setCreditsToUse] = useState(0);

// 3. total 計算
const total = subtotal - creditsToUse + shippingFee;

// 4. 訂單摘要中插入（運費和折扣碼之間）
<CreditsSelectorV2
  customerId={customerId}
  orderSubtotal={subtotal}
  onCreditsChange={setCreditsToUse}
/>

// 5. 折抵金額顯示
{creditsToUse > 0 && (
  <div className="flex justify-between text-sm">
    <span className="text-[#D4AF37]">🎁 折抵優惠</span>
    <span className="text-[#D4AF37]">-${creditsToUse.toLocaleString()}</span>
  </div>
)}

// 6. metadata 帶上折抵金額
metadata: {
  ...existing,
  credits_used: creditsToUse
}
```

---

## 六、W5 — 退款回錢包

### 6.1 退款場景

| 場景 | 原支付方式 | 退款方式 |
|------|-----------|---------|
| A. 全額退貨（純信用卡） | 信用卡 $3,000 | 退回信用卡 $3,000 |
| B. 全額退貨（信用卡 + 折抵） | 信用卡 $2,700 + 折抵 $300 | 信用卡退 $2,700 + 購物金退回 $300 |
| C. 部分退貨 | 信用卡 $2,700 + 折抵 $300 | 按比例：信用卡退 X + 購物金退回 Y |
| D. 客訴補償 | N/A | 直接發放購物金（admin_grant） |

### 6.2 折抵退回邏輯

```
POST /api/wallet/refund
Body: {
  order_id: 'order_xxx',
  refund_amount: 300        // 要退回的折抵金額
  reason: '退貨退款'
}

邏輯：
1. 查 wallet_transaction WHERE reference_type='order' AND reference_id=order_id AND type='spend'
2. 取得原始扣款的分配明細（各錢包各扣多少）
3. 按原始比例退回各錢包
4. INSERT wallet_transaction type='refund'
5. UPDATE member_wallet.balance += 退回金額

⚠️ 退回的購物金 expires_at 設為原始 earn 的 expires_at（保持原過期日）
   如果原始已過期，則退回的也直接過期（不額外延長）
```

### 6.3 新增 transaction type

```sql
-- wallet_transaction.type 新增 'refund'
-- 現有：earn, spend, expire, adjust
-- 新增：refund（退款退回）、admin_grant（手動發放）

ALTER TABLE wallet_transaction 
  DROP CONSTRAINT IF EXISTS wallet_transaction_type_check;
ALTER TABLE wallet_transaction 
  ADD CONSTRAINT wallet_transaction_type_check 
  CHECK (type IN ('earn', 'spend', 'expire', 'adjust', 'refund', 'admin_grant'));
```

---

## 七、W6 — 併發扣款保護

### 7.1 樂觀鎖

在 `POST /api/wallet/deduct` 的 UPDATE 中使用 `WHERE balance >= amount`：

```sql
-- 扣款時的樂觀鎖
UPDATE member_wallet 
SET balance = balance - $deduct_amount,
    total_spent = total_spent + $deduct_amount,
    updated_at = NOW()
WHERE customer_id = $customer_id 
  AND merchant_code = 'minjie'
  AND wallet_type = $wallet_type
  AND balance >= $deduct_amount;  -- ← 樂觀鎖：餘額不足則 affected_rows = 0

-- 如果 affected_rows = 0 → 整個 transaction ROLLBACK → 回傳錯誤
```

### 7.2 為什麼不用 SELECT FOR UPDATE

`SELECT FOR UPDATE` 會鎖住行，在高併發下造成排隊。MINJIE 的規模用樂觀鎖即可，失敗時回傳「餘額不足，請重新操作」。

---

## 八、W7 — CMS 等級顯示名稱修正

### 8.1 需修改的 CMS 位置

| 位置 | 現有顯示 | 改為 |
|------|---------|------|
| 會員列表等級篩選 | 白金/菁英/至善 | 鉑金/頂級/王座 |
| 會員詳情等級標籤 | 同上 | 同上 |
| 等級設定頁（如有） | 同上 | 同上 |

### 8.2 修改方式

CMS 前端應從 `tier_config.tier_name` 動態讀取，而非寫死。如果目前是寫死的 mapping，改為 API 回傳 `tier_name`。

```typescript
// ❌ 寫死 mapping（移除）
const tierNameMap = {
  platinum: '白金',
  elite: '菁英',
  throne: '至善',
};

// ✅ 從 tier_config 取（API 應回傳 tier_name）
// GET /api/tiers → [{ tier_level: 'platinum', tier_name: '鉑金會員' }, ...]
```

---

## 九、W8 — CMS 手動發放 / 調整購物金

### 9.1 使用場景

| 場景 | 操作 | transaction type |
|------|------|-----------------|
| 客訴補償 | 發放 $50 給特定客戶 | admin_grant |
| 行銷活動 | 全體金卡以上發 $200 | admin_grant |
| 帳務修正 | 扣除誤發的 $100 | adjust |
| 節日促銷 | 指定名單發不同金額 | admin_grant |

### 9.2 CMS UI

會員詳情頁的錢包區塊新增「調整」按鈕：

```
┌─ 獎勵帳戶 ──────────────────────────┐
│ 💰 購物金    $150   [+ 調整]         │
│ 🎂 生日禮金  $500   [+ 調整]         │
│ ⭐ 紅利點數  20 點   [+ 調整]         │
└──────────────────────────────────────┘

點擊 [+ 調整] 彈出 Dialog：
┌─ 調整購物金 ─────────────────────────┐
│ 類型：  ○ 增加  ○ 扣除               │
│ 金額：  [$___________]               │
│ 原因：  [客訴補償 / 行銷活動 / 其他]  │
│ 備註：  [_______________]            │
│ 過期日：[____] 天後（增加時需填）     │
│                                      │
│        [取消]  [確認調整]             │
└──────────────────────────────────────┘
```

### 9.3 API

```
POST /api/admin/wallet/adjust
Body: {
  customer_id: 'cus_xxx',
  wallet_type: 'shopping_credit',
  type: 'admin_grant' | 'adjust',
  amount: 50,            // 正數增加，負數扣除
  reason: '客訴補償',
  expires_days: 90,      // 增加時的過期天數，null=不過期
  operator_id: 'admin_xxx'
}
```

---

## 十、W9 — 到期提醒 LINE 推播

### 10.1 觸發規則

```sql
-- pg_cron 每天 10:00 UTC+8（02:00 UTC）

-- 找出 7 天內有購物金到期的客戶
SELECT DISTINCT eu.customer_id, clp.line_user_id,
  SUM(wt.amount) AS expiring_amount,
  MIN(wt.expires_at) AS earliest_expiry
FROM wallet_transaction wt
JOIN member_wallet mw ON mw.id = wt.wallet_id
JOIN email_users eu ON eu.customer_id = mw.customer_id
LEFT JOIN customer_line_profiles clp ON clp.customer_id = eu.customer_id
WHERE wt.type = 'earn'
  AND wt.expires_at BETWEEN NOW() AND NOW() + INTERVAL '7 days'
  -- 排除已發過提醒的（用 notification_log 表或 reference_id 冪等）
GROUP BY eu.customer_id, clp.line_user_id
HAVING SUM(wt.amount) > 0;
```

### 10.2 推播內容

```
🎁 購物金到期提醒

您有 $150 購物金將於 3/15 到期
把握機會，現在就去逛逛！

[立即選購] ← 連到商品頁
```

推播時機：到期前 7 天 + 到期前 1 天（各一次）

---

## 十一、W10 — 每日對帳快照

### 11.1 快照表

```sql
CREATE TABLE IF NOT EXISTS wallet_ledger_snapshot (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  merchant_code VARCHAR(50) NOT NULL DEFAULT 'minjie',
  wallet_type VARCHAR(50) NOT NULL,
  total_wallets INTEGER NOT NULL,
  total_balance NUMERIC(12,2) NOT NULL,
  total_earned_today NUMERIC(12,2) DEFAULT 0,
  total_spent_today NUMERIC(12,2) DEFAULT 0,
  total_expired_today NUMERIC(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(snapshot_date, merchant_code, wallet_type)
);
```

### 11.2 每日快照 pg_cron

```sql
-- 每天 04:00 UTC+8（20:00 UTC 前一天）
INSERT INTO wallet_ledger_snapshot (snapshot_date, merchant_code, wallet_type, total_wallets, total_balance, total_earned_today, total_spent_today, total_expired_today)
SELECT 
  CURRENT_DATE,
  'minjie',
  mw.wallet_type,
  COUNT(*),
  SUM(mw.balance),
  COALESCE((SELECT SUM(amount) FROM wallet_transaction wt WHERE wt.wallet_type = mw.wallet_type AND wt.type = 'earn' AND wt.created_at >= CURRENT_DATE), 0),
  COALESCE((SELECT SUM(ABS(amount)) FROM wallet_transaction wt WHERE wt.wallet_type = mw.wallet_type AND wt.type = 'spend' AND wt.created_at >= CURRENT_DATE), 0),
  COALESCE((SELECT SUM(ABS(amount)) FROM wallet_transaction wt WHERE wt.wallet_type = mw.wallet_type AND wt.type = 'expire' AND wt.created_at >= CURRENT_DATE), 0)
FROM member_wallet mw
WHERE mw.merchant_code = 'minjie'
GROUP BY mw.wallet_type
ON CONFLICT (snapshot_date, merchant_code, wallet_type) DO UPDATE
SET total_wallets = EXCLUDED.total_wallets,
    total_balance = EXCLUDED.total_balance,
    total_earned_today = EXCLUDED.total_earned_today,
    total_spent_today = EXCLUDED.total_spent_today,
    total_expired_today = EXCLUDED.total_expired_today;
```

### 11.3 月報查詢

```sql
-- 本月購物金報表
SELECT 
  wallet_type,
  SUM(total_earned_today) AS monthly_earned,
  SUM(total_spent_today) AS monthly_spent,
  SUM(total_expired_today) AS monthly_expired,
  MAX(total_balance) AS peak_balance,
  (SELECT total_balance FROM wallet_ledger_snapshot 
   WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM wallet_ledger_snapshot)
   AND wallet_type = wls.wallet_type) AS current_balance
FROM wallet_ledger_snapshot wls
WHERE snapshot_date >= DATE_TRUNC('month', CURRENT_DATE)
  AND merchant_code = 'minjie'
GROUP BY wallet_type;
```

---

## 十二、W11 — 審計欄位補充

### 12.1 wallet_transaction 新增欄位

```sql
ALTER TABLE wallet_transaction 
  ADD COLUMN IF NOT EXISTS operator_type VARCHAR(20) DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS operator_id VARCHAR(100),
  ADD COLUMN IF NOT EXISTS ip_address INET,
  ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(200);

-- operator_type: 'system'（自動）、'admin'（CMS 手動）、'customer'（結帳）、'cron'（排程）
-- operator_id: admin 的 user id 或 'pg_cron' 或 customer_id
-- ip_address: 結帳時的客戶 IP
-- idempotency_key: 通用防重 key（可取代 reference_type + reference_id 組合）

CREATE UNIQUE INDEX IF NOT EXISTS idx_wallet_tx_idempotency 
  ON wallet_transaction(idempotency_key) 
  WHERE idempotency_key IS NOT NULL;
```

### 12.2 餘額驗證排程

```sql
-- 每週一次：驗證 member_wallet.balance 是否等於 SUM(wallet_transaction.amount)
-- 不一致則寫入 alert 表

WITH balance_check AS (
  SELECT 
    mw.id AS wallet_id,
    mw.customer_id,
    mw.wallet_type,
    mw.balance AS recorded_balance,
    COALESCE(SUM(wt.amount), 0) AS calculated_balance
  FROM member_wallet mw
  LEFT JOIN wallet_transaction wt ON wt.wallet_id = mw.id
  WHERE mw.merchant_code = 'minjie'
  GROUP BY mw.id
  HAVING mw.balance != COALESCE(SUM(wt.amount), 0)
)
SELECT * FROM balance_check;
-- 如果有結果 → 需要排查
```

---

## 十三、實作順序與 Claude Code 指令

### Phase 1（P0，4 天）

**Day 1：W1 + W2（SQL Migration）**

> 執行 `Multi_Currency_Wallet_SDD_v2_0.md` 第二節和第三節的 SQL。
>
> 1. 先在 Supabase SQL Editor 備份：`SELECT * FROM tier_config WHERE merchant_code = 'minjie'` 和 `SELECT tier_level, COUNT(*) FROM member_tier WHERE merchant_code = 'minjie' GROUP BY tier_level`
> 2. 執行第二節 W1 SQL（等級 elite → premium + tier_name 對齊 + CHECK constraint + fn_auto_upgrade_tier 更新）
> 3. 執行第三節 W2 SQL（merchant_settings 加 wallet_rules + wallet_type_config 簡化）
> 4. 跑驗證 query 確認沒有 elite 殘留，premium 筆數正確

**Day 2：W3（API 重寫）**

> 重寫 Storefront 的 wallet API，參考 SDD v2.0 第四節：
>
> 1. `app/api/wallet/balance/route.ts` — 新增 `view` 參數（checkout/detail），checkout 模式回傳 total_available + max_deduction + nearest_expiry；detail 模式回傳分錢包明細 + 到期時間 + 最近交易
> 2. `app/api/wallet/deduct/route.ts` — 改為只接收一個 `amount`，後端按過期日 ASC 排序跨錢包 FIFO 扣款，UPDATE 用 `WHERE balance >= amount` 樂觀鎖
> 3. 從 merchant_settings 讀取 wallet_rules（deduction_min_order=1000, deduction_max_pct=0.10）而非 wallet_type_config.tier_rules
> 4. 新增 `app/api/wallet/refund/route.ts` — 退款回錢包，按原始扣款比例退回

**Day 3：W4（前端 CreditsSelector v2）**

> 重寫結帳頁折抵 UI，參考 SDD v2.0 第五節：
>
> 1. 新增 `components/checkout/CreditsSelectorV2.tsx` — 單一滑桿/輸入框，顯示可用額度和上限，到期提醒
> 2. 整合進 `app/checkout/page.tsx`：在訂單摘要的運費和折扣碼之間插入
> 3. 訂單 < $1,000 或餘額 = 0 或未登入時不顯示
> 4. metadata 帶上 credits_used
> 5. 配色用黑金主題（#D4AF37）

**Day 4：W5 + W6（退款 + 併發保護）**

> 在 Day 2 的 deduct API 基礎上補充：
>
> 1. 確認 deduct 的 UPDATE 已有 `WHERE balance >= amount` 樂觀鎖
> 2. refund API 完成（按原始扣款比例退回）
> 3. 端對端測試：結帳扣款 → 退款 → 餘額正確

### Phase 2（P1，1.5 天）

**W7：CMS 等級名稱**
> CMS repo 搜尋所有寫死的等級名稱 mapping，改為從 API 動態取 tier_name。搜尋關鍵字：白金、菁英、至善、elite

**W8：CMS 手動發放**
> 會員詳情頁新增「調整」按鈕，參考 SDD 第九節。POST /api/admin/wallet/adjust

**W9：到期提醒推播**
> Supabase Edge Function `wallet-expiry-notify`，pg_cron 每天觸發，7 天內到期的推 LINE

### Phase 3（P2，1 天）

**W10 + W11：對帳快照 + 審計欄位**

---

## 十四、驗證 Checklist

### P0 驗證

| # | 測試 | 預期結果 |
|---|------|---------|
| 1 | `SELECT DISTINCT tier_level FROM member_tier` | 不含 elite |
| 2 | `SELECT tier_name FROM tier_config WHERE tier_level='premium'` | 頂級會員 |
| 3 | GET /api/wallet/balance?view=checkout（訂單 $3,990） | max_deduction = 399 |
| 4 | GET /api/wallet/balance?view=checkout（訂單 $500） | order_qualifies = false |
| 5 | POST /api/wallet/deduct amount=399 | 按 FIFO 扣三個錢包，總額 399 |
| 6 | 重複 POST 同一 order_id | 回傳錯誤，不重複扣 |
| 7 | 雙設備同時扣款（餘額 $300，各扣 $200） | 一個成功，一個失敗（樂觀鎖） |
| 8 | 退款 $300 | 按原比例退回三個錢包 |
| 9 | 結帳頁 UI 顯示折抵區塊 | 有滑桿、有到期提醒 |
| 10 | 結帳頁訂單 < $1,000 | 折抵區塊不顯示 |

---

## 十五、版本歷史

| 版本 | 日期 | 變更 |
|------|------|------|
| v1.0 | 2026-02-15 | 初版：三幣種架構 + 分等級差異化 |
| v2.0 | 2026-02-16 | 等級對齊 ktai + 規則統一化 + 合併顯示 + FIFO 扣款 + 退款 + 併發保護 + 審計 |
