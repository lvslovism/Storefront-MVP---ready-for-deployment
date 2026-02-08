$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token}
$result = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/promo_01KGZ5PH7R4TG7NTGMYT0FZFFH" -Headers $headers
Write-Host "Status:" $result.promotion.status
Write-Host "IsAutomatic:" $result.promotion.is_automatic
Write-Host "Value:" $result.promotion.application_method.value
$result.promotion.rules | ForEach-Object { Write-Host "Rule:" $_.attribute $_.operator $_.values }
