# verify-all.ps1 — Verify all Lick.fun contracts on MonadVision (Sourcify)
# Usage: cd contracts; .\verify-all.ps1
#
# Temporarily disables ETHERSCAN_API_KEY in .env to force Sourcify verifier,
# runs all verifications, then restores .env.

$ENV_FILE = ".env"
$VERIFIER_URL = "https://sourcify-api-monad.blockvision.org/"
$CHAIN_ID = "143"
$RPC = "https://rpc.monad.xyz"

# ── Patch .env ──────────────────────────────────────────────────────────────
$originalEnv = Get-Content $ENV_FILE -Raw
# Forge auto-loads .env on startup — must physically remove the key line
$patchedEnv = $originalEnv -replace '(?m)^ETHERSCAN_API_KEY=.*(\r?\n)', ''
Set-Content $ENV_FILE $patchedEnv -NoNewline
Write-Host "✅ ETHERSCAN_API_KEY removed from .env for verification" -ForegroundColor Yellow

# ── Helper ──────────────────────────────────────────────────────────────────
function Verify($address, $contract) {
    Write-Host ""
    Write-Host "▶ Verifying $contract at $address" -ForegroundColor Cyan
    forge verify-contract `
        --rpc-url $RPC `
        --verifier sourcify `
        --verifier-url $VERIFIER_URL `
        --chain-id $CHAIN_ID `
        $address `
        $contract 2>&1
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ $contract verified" -ForegroundColor Green
    } else {
        Write-Host "❌ $contract FAILED (exit $LASTEXITCODE)" -ForegroundColor Red
    }
}

# ── Contracts ───────────────────────────────────────────────────────────────

# Phase 1 — Founder LickToken
Verify "0x0236787a1baaeed46a123fa264a2355eed11d151" "src/LickToken.sol:LickToken"

# Phase 2 — Protocol contracts
Verify "0x9845c5625d9f9C48e17956940485aAAAD168aA10" "src/Factory.sol:Factory"
Verify "0xee3A05b788f375C34cF4d6EC63Ef3872D87b62c8" "src/LickFactory.sol:LickFactory"
Verify "0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2" "src/GraduationRouter.sol:GraduationRouter"
Verify "0xd0CC6C69162eb0635A7d423aEb2086F1821cA844" "src/LickRouter.sol:LickRouter"
Verify "0x5BBe528936E627d33DE36f10d9DB946089b9E903" "src/FeeRouter.sol:FeeRouter"
Verify "0x33e576E95F0d6f6B214F602ec5022Ffed0Eae389" "src/GraduationPool.sol:GraduationPool"
Verify "0xe9200097cA7d7a48D87ce249B671c36ccB406776" "src/PredictionMarket.sol:PredictionMarket"

# Phase 3 — New v2 vaults
Verify "0x45b1ee1e9e8e9ff8ce6bbbd55b430cab4b25e06d" "src/VaultBuybackBurn.sol:VaultBuybackBurn"
Verify "0xf1aac85a5f964564e472bf1e0628c536b01809e0" "src/VaultLPSupport.sol:VaultLPSupport"

# ── Restore .env ─────────────────────────────────────────────────────────────
Set-Content $ENV_FILE $originalEnv -NoNewline
Write-Host ""
Write-Host "✅ .env restored" -ForegroundColor Yellow
Write-Host ""
Write-Host "=== Done. Check https://monadvision.com/verified-contracts ===" -ForegroundColor Magenta
