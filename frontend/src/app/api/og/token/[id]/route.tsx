import { ImageResponse } from "next/og";
import { getGraphQLClient } from "@/lib/graphql/client";
import { QUERY_TOKEN, type TokenEntity } from "@/lib/graphql/queries";
import { getTokenPrice, getGraduationProgress, formatMon } from "@/lib/bondingCurve";

export const runtime = "edge";

interface TokenResponse {
  Token_by_pk: Record<string, unknown> | null;
}

/**
 * Envio returns numeric scalar fields as strings over GraphQL — must be
 * explicitly converted to BigInt before use in bonding-curve math.
 */
function toBigIntToken(raw: Record<string, unknown>): TokenEntity {
  return {
    ...(raw as unknown as TokenEntity),
    virtualMon: BigInt(raw.virtualMon as string),
    virtualTokens: BigInt(raw.virtualTokens as string),
    targetTokenAmount: BigInt(raw.targetTokenAmount as string),
    startTime: BigInt(raw.startTime as string),
    startBlock: BigInt(raw.startBlock as string),
    realMon: BigInt(raw.realMon as string),
    soldTokens: BigInt(raw.soldTokens as string),
    createdAt: BigInt(raw.createdAt as string),
    graduatedAt: raw.graduatedAt != null ? BigInt(raw.graduatedAt as string) : null,
    totalBuyVolume: BigInt(raw.totalBuyVolume as string),
    totalSellVolume: BigInt(raw.totalSellVolume as string),
  };
}

async function getToken(id: string) {
  try {
    const client = getGraphQLClient();
    const res = await client.request<TokenResponse>(QUERY_TOKEN, { id: id.toLowerCase() });
    if (!res.Token_by_pk) return null;
    return toBigIntToken(res.Token_by_pk);
  } catch {
    return null;
  }
}


export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = await getToken(id);

  const name = token?.name || "Unknown Token";
  const symbol = token?.symbol || "???";
  const { monPerToken, marketCapMon } = token
    ? getTokenPrice(token.realMon, token.soldTokens)
    : { monPerToken: 0, marketCapMon: 0 };
  const progress = token ? getGraduationProgress(token.realMon) : 0;
  const marketCap = formatMon(BigInt(Math.round(marketCapMon * 1e18)));
  const graduated = token?.graduated ?? false;

  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: "#0B0D0E",
          backgroundImage:
            "radial-gradient(circle at 25% 15%, rgba(56, 224, 123, 0.18), transparent 55%)",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <div
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "16px",
              backgroundColor: "#38E07B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 700,
              color: "#0B0D0E",
            }}
          >
            L
          </div>
          <div style={{ fontSize: "28px", color: "#9CA3AF", fontWeight: 600 }}>
            Lickfun.xyz
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: "20px" }}>
            <div style={{ fontSize: "76px", fontWeight: 800, color: "#FFFFFF" }}>
              ${symbol}
            </div>
            <div style={{ fontSize: "36px", color: "#9CA3AF" }}>{name}</div>
          </div>

          <div style={{ display: "flex", gap: "48px", marginTop: "24px" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "22px", color: "#6B7280" }}>Price</div>
              <div style={{ fontSize: "34px", color: "#38E07B", fontWeight: 700 }}>
                {monPerToken.toFixed(8)} MON
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "22px", color: "#6B7280" }}>Market Cap</div>
              <div style={{ fontSize: "34px", color: "#FFFFFF", fontWeight: 700 }}>
                {marketCap}
              </div>
            </div>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ fontSize: "22px", color: "#6B7280" }}>Status</div>
              <div style={{ fontSize: "34px", color: "#FFFFFF", fontWeight: 700 }}>
                {graduated ? "Graduated" : `${progress.toFixed(0)}% bonded`}
              </div>
            </div>
          </div>
        </div>

        <div style={{ fontSize: "24px", color: "#6B7280" }}>
          Trade on a bonding curve on Monad — lickfun.xyz
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
