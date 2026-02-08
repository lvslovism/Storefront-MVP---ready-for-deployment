$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token}
$result = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions" -Headers $headers
$result.promotions | ForEach-Object { Write-Host $_.id $_.code $_.status $_.is_automatic $_.application_method.value }
