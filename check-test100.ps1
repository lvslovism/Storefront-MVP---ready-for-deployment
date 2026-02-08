$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token}
$result = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/promo_01KGYY6P7G0M9SSEHF3WYP8QJ2?fields=*application_method" -Headers $headers
$am = $result.promotion.application_method
Write-Host "type:" $am.type "target_type:" $am.target_type "allocation:" $am.allocation "value:" $am.value
