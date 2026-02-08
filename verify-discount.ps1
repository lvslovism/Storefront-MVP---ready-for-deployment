$pk = @{"x-publishable-api-key"="pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2"; "Content-Type"="application/json"}

# 建 cart + 加商品
$cart = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts" -Method POST -Headers $pk -Body '{"region_id":"reg_01KFFT966Q197EXXNSKR3J8Q5T"}'
$cartId = $cart.cart.id

$items = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/products" -Headers $pk
$v1 = $items.products[0].variants[0].id
$v2 = $items.products[1].variants[0].id

Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body ('{"variant_id":"' + $v1 + '","quantity":3}') | Out-Null
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body ('{"variant_id":"' + $v2 + '","quantity":1}') | Out-Null

# 套用 TEST100
$c = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/promotions" -Method POST -Headers $pk -Body '{"promo_codes":["TEST100"]}'
Write-Host "Subtotal:" $c.cart.subtotal
Write-Host "Discount:" $c.cart.discount_total
Write-Host "Total:" $c.cart.total
Write-Host "Promotions:"
$c.cart.promotions | ForEach-Object { Write-Host "  " $_.code $_.application_method.value }
Write-Host "Item adjustments:"
$c.cart.items | ForEach-Object { $_.adjustments | ForEach-Object { Write-Host "  code:" $_.code "amount:" $_.amount } }
