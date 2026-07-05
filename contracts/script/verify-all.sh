#!/usr/bin/env bash
# verify-all.sh — Verify all Lick.fun contracts on MonadVision via Sourcify
#
# Usage:
#   cd contracts
#   ./script/verify-all.sh
#
# Notes:
#   - MonadVision uses Sourcify (https://monadvision.com/verify-contract)
#   - URL MUST end with '/' — see https://docs.blockvision.org/reference/verify-smart-contract-on-monad-explorer
#   - No constructor args needed — Sourcify matches by metadata hash
#   - No API key needed — Sourcify is open
#
# Re-run safely: each verify is idempotent (Sourcify returns "already verified" if so).

set -euo pipefail

# ─── Mainnet addresses (chain 143) ───────────────────────────────────────────
FOUNDER_TOKEN="0x0236787a1baaeed46a123fa264a2355eed11d151"
FACTORY="0x9845c5625d9f9C48e17956940485aAAAD168aA10"
LICK_FACTORY="0xee3A05b788f375C34cF4d6EC63Ef3872D87b62c8"
GRADUATION_ROUTER="0xb2Dc164Ac4eCDDA7Ea2D4115bC122463c65460b2"
LICK_ROUTER="0xd0CC6C69162eb0635A7d423aeb2086f1821CA844"
FEE_ROUTER="0x5BBe528936E627d33DE36f10d9DB946089b9E903"
GRADUATION_POOL="0x33e576E95F0d6f6B214F602ec5022Ffed0Eae389"
PREDICTION_MARKET="0xe9200097cA7d7a48D87ce249B671c36ccB406776"

# ─── Verifier config ─────────────────────────────────────────────────────────
RPC_URL="https://rpc.monad.xyz"
CHAIN_ID=143
VERIFIER_URL="https://sourcify-api-monad.blockvision.org/"

# ─── Verify helper ───────────────────────────────────────────────────────────
verify() {
  local label="$1"
  local address="$2"
  local target="$3"

  echo ""
  echo "════════════════════════════════════════════════════════════════"
  echo "  Verifying: $label"
  echo "  Address:  $address"
  echo "  Target:   $target"
  echo "════════════════════════════════════════════════════════════════"

  forge verify-contract \
    --rpc-url "$RPC_URL" \
    --verifier sourcify \
    --verifier-url "$VERIFIER_URL" \
    --chain-id "$CHAIN_ID" \
    "$address" \
    "$target" \
    || echo "  ⚠️  $label verification returned non-zero (may already be verified)"
}

# ─── Run all verifications ───────────────────────────────────────────────────
verify "Founder LickToken"   "$FOUNDER_TOKEN"      "src/LickToken.sol:LickToken"
verify "Factory"             "$FACTORY"            "src/Factory.sol:Factory"
verify "LickFactory (DEX)"   "$LICK_FACTORY"       "src/LickFactory.sol:LickFactory"
verify "GraduationRouter"    "$GRADUATION_ROUTER"  "src/GraduationRouter.sol:GraduationRouter"
verify "LickRouter"          "$LICK_ROUTER"        "src/LickRouter.sol:LickRouter"
verify "FeeRouter"           "$FEE_ROUTER"         "src/FeeRouter.sol:FeeRouter"
verify "GraduationPool"      "$GRADUATION_POOL"    "src/GraduationPool.sol:GraduationPool"
verify "PredictionMarket"    "$PREDICTION_MARKET"  "src/PredictionMarket.sol:PredictionMarket"

echo ""
echo "════════════════════════════════════════════════════════════════"
echo "  ✅ All verifications submitted"
echo "  Check results: https://monadvision.com/verified-contracts"
echo "════════════════════════════════════════════════════════════════"
