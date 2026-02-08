$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token; "Content-Type"="application/json"}

# 建一個無條件自動折扣測試
$promoBody = '{"code":"AUTO_TEST","type":"standard","is_automatic":true,"status":"active","application_method":{"type":"fixed","target_type":"order","value":50,"currency_code":"twd"}}'
$promo = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions" -Method POST -Headers $headers -Body $promoBody
$promoId = $promo.promotion.id
Write-Host "Created:" $promoId $promo.promotion.status

# 啟用
$activate = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/$promoId" -Method POST -Headers $headers -Body '{"status":"active"}'
Write-Host "Activated:" $activate.promotion.status

# 建 cart + 加商品
$pk = @{"x-publishable-api-key"="pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2"; "Content-Type"="application/json"}
$cart = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts" -Method POST -Headers $pk -Body '{"region_id":"reg_01KFFT966Q197EXXNSKR3J8Q5T"}'
$cartId = $cart.cart.id

$items = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/products" -Headers $pk
$variantId = $items.products[0].variants[0].id
$addBody = '{"variant_id":"' + $variantId + '","quantity":1}'
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body $addBody | Out-Null

# 直接 GET cart 看 discount
$c1 = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId" -Headers $pk
Write-Host "Before promotions call - Discount:" $c1.cart.discount_total "Total:" $c1.cart.total

# 主動呼叫 promotions endpoint
$c2 = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/promotions" -Method POST -Headers $pk -Body '{"promo_codes":["AUTO_TEST"]}'
Write-Host "After promotions call - Discount:" $c2.cart.discount_total "Total:" $c2.cart.total

# 清理：刪除測試 promotion
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/$promoId" -Method DELETE -Headers $headers | Out-Null
Write-Host "Deleted test promotion"
