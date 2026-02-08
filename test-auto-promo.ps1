$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token}

$carts = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/orders?limit=1" -Headers $headers
Write-Host "--- Recent carts check ---"

$pk = @{"x-publishable-api-key"="pk_9e9c701859cf64dcc2679cb893ae10055f19f3aaa941eb7bcc95493e20256eb2"; "Content-Type"="application/json"}
$cart = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts" -Method POST -Headers $pk -Body '{"region_id":"reg_01KFFT966Q197EXXNSKR3J8Q5T"}'
$cartId = $cart.cart.id
Write-Host "Cart created:" $cartId

$items = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/products" -Headers $pk
$variantId = $items.products[0].variants[0].id
Write-Host "Adding variant:" $variantId

Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId/line-items" -Method POST -Headers $pk -Body "{`"variant_id`":`"$variantId`",`"quantity`":3}"
$updated = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/store/carts/$cartId" -Headers $pk

Write-Host "Subtotal:" $updated.cart.subtotal
Write-Host "Discount:" $updated.cart.discount_total
Write-Host "Total:" $updated.cart.total
Write-Host "Promotions:" ($updated.cart.promotions | ConvertTo-Json -Depth 3)
