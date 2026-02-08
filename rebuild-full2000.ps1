$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token; "Content-Type"="application/json"}

# 刪除舊的
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/promo_01KGZ7Z9CGH15A3AK063TPFC89" -Method DELETE -Headers $headers | Out-Null
Write-Host "Deleted old FULL2000"

# 建新的（無 rules）
$promoBody = '{"code":"FULL2000","type":"standard","is_automatic":true,"status":"active","application_method":{"type":"fixed","target_type":"order","value":200,"currency_code":"twd"}}'
$promo = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions" -Method POST -Headers $headers -Body $promoBody
$promoId = $promo.promotion.id
Write-Host "Created:" $promoId "Status:" $promo.promotion.status

# 確保啟用
$activate = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/$promoId" -Method POST -Headers $headers -Body '{"status":"active"}'
Write-Host "Activated:" $activate.promotion.status

# 驗證
$pk = @{"x-publishable-api-key"="pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2"; "Content-Type"="application/json"}
$cart = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts" -Method POST -Headers $pk -Body '{"region_id":"reg_01KFFT966Q197EXXNSKR3J8Q5T"}'
$cartId = $cart.cart.id
$items = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/products" -Headers $pk
$variantId = $items.products[0].variants[0].id
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body ('{"variant_id":"' + $variantId + '","quantity":1}') | Out-Null
$c = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId" -Headers $pk
Write-Host "1 item - Subtotal:" $c.cart.subtotal "Discount:" $c.cart.discount_total "Total:" $c.cart.total
