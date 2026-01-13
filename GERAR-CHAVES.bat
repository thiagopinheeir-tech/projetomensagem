@echo off
echo.
echo ============================================================
echo   GERANDO CHAVES PARA RAILWAY
echo ============================================================
echo.

node -e "const c=require('crypto');const f=require('fs');const j=c.randomBytes(32).toString('hex');const e=c.randomBytes(32).toString('hex');console.log('JWT_SECRET='+j);console.log('ENCRYPTION_KEY='+e);const content='🔑 CHAVES GERADAS PARA RAILWAY\n\n============================================================\n\n1️⃣ JWT_SECRET:\n'+j+'\n\n2️⃣ ENCRYPTION_KEY:\n'+e+'\n\n============================================================\n\n📋 VALORES PARA COPIAR:\n\nJWT_SECRET='+j+'\nENCRYPTION_KEY='+e+'\n';f.writeFileSync('CHAVES-RAILWAY.txt',content,'utf8');console.log('\n✅ Arquivo salvo: CHAVES-RAILWAY.txt\n');"

echo.
echo ============================================================
echo   CHAVES GERADAS COM SUCESSO!
echo ============================================================
echo.
echo Abra o arquivo CHAVES-RAILWAY.txt para ver as chaves.
echo.
pause
