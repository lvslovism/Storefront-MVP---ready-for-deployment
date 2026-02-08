$pk = @{"x-publishable-api-key"="pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2"; "Content-Type"="application/json"}
$cart = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts" -Method POST -Headers $pk -Body '{"region_id":"reg_01KFFT966Q197EXXNSKR3J8Q5T"}'
$cartId = $cart.cart.id

$items = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/products" -Headers $pk
$v1 = $items.products[0].variants[0].id
$v2 = $items.products[1].variants[0].id
Write-Host "Product 0:" $items.products[0].title "Variant:" $v1
Write-Host "Product 1:" $items.products[1].title "Variant:" $v2

# 模擬截圖：1件 + 3件
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body ('{"variant_id":"' + $v1 + '","quantity":1}') | Out-Null
Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body ('{"variant_id":"' + $v2 + '","quantity":3}') | Out-Null

# 套用 TEST100
$c = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/promotions" -Method POST -Headers $pk -Body '{"promo_codes":["TEST100"]}'
Write-Host ""
Write-Host "=== Cart Summary ==="
Write-Host "Subtotal:" $c.cart.subtotal
Write-Host "Discount Total:" $c.cart.discount_total
Write-Host "Total:" $c.cart.total
Write-Host ""
Write-Host "=== Promotions ==="
$c.cart.promotions | ForEach-Object { Write-Host "  " $_.code "value:" $_.application_method.value "type:" $_.application_method.type "target:" $_.application_method.target_type }
Write-Host ""
Write-Host "=== Items ==="
$c.cart.items | ForEach-Object {
    Write-Host "  Item:" $_.title "qty:" $_.quantity "subtotal:" $_.subtotal "total:" $_.total
    $_.adjustments | ForEach-Object { Write-Host "    adj:" $_.code "amount:" $_.amount }
}
