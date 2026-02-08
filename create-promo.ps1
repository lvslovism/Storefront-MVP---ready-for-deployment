$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token; "Content-Type"="application/json"}

$promoBody = '{"code":"FULL2000","type":"standard","is_automatic":true,"application_method":{"type":"fixed","target_type":"order","value":200,"currency_code":"twd"},"rules":[{"attribute":"cart.total","operator":"gte","values":["2000"]}]}'

$result = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions" -Method POST -Headers $headers -Body $promoBody
Write-Host "ID:" $result.promotion.id
Write-Host "Code:" $result.promotion.code
Write-Host "Status:" $result.promotion.status
Write-Host "IsAutomatic:" $result.promotion.is_automatic
Write-Host "Value:" $result.promotion.application_method.value
$result.promotion.rules | ForEach-Object { Write-Host "Rule:" $_.attribute $_.operator $_.values }
