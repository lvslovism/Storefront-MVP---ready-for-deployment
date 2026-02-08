$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token; "Content-Type"="application/json"}

# 清空 rules
$result = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/promo_01KGZ7Z9CGH15A3AK063TPFC89" -Method POST -Headers $headers -Body '{"rules":[]}'
Write-Host "Rules count:" $result.promotion.rules.Count
Write-Host "Status:" $result.promotion.status

# 驗證：低金額 cart 也會折
$pk = @{"x-publishable-api-key"="pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2"; "Content-Type"="application/json"}
$cart = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts" -Method POST -Headers $pk -Body '{"region_id":"reg_01KFFT966Q197EXXNSKR3J8Q5T"}'
$cartId = $cart.cart.id
$items = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/products" -Headers $pk
$variantId = $items.products[0].variants[0].id
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body ('{"variant_id":"' + $variantId + '","quantity":1}') | Out-Null
$c = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId" -Headers $pk
Write-Host "1 item - Subtotal:" $c.cart.subtotal "Discount:" $c.cart.discount_total "Total:" $c.cart.total
