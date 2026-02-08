$body = '{"email":"admin@minjie.com","password":"Admin@123456!"}'
$auth = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/auth/user/emailpass" -Method POST -ContentType "application/json" -Body $body
$headers = @{"Authorization"="Bearer " + $auth.token; "Content-Type"="application/json"}
$result = Invoke-RestMethod -Uri "https://medusa-store-minjie-production.up.railway.app/admin/promotions/promo_01KGZ7Z9CGH15A3AK063TPFC89" -Method POST -Headers $headers -Body '{"status":"active"}'
Write-Host "Status:" $result.promotion.status
