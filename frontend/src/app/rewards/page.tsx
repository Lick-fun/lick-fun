"use client";

export default function RewardsPage() {
  const holdCampaigns = [
    {
      title: "Buy and Hold 10K Wolfy",
      prize: "13M $Wolfy",
      image: "🐺",
      joined: false,
    },
    {
      title: "Buy and Hold 100K $Strike",
      prize: "13M $Strike",
      image: "⚡",
      joined: false,
    },
    {
      title: "Buy and Hold 50K $Moon",
      prize: "10M $Moon",
      image: "🌙",
      joined: false,
    },
  ];

  const airdropCampaigns = [
    {
      title: "Buy and Hold 10K Wolfy",
      prize: "13M $Wolfy",
      image: "🐺",
      joined: false,
    },
    {
      title: "Buy and Hold 10K $Meme",
      prize: "8M $Meme",
      image: "🎭",
      joined: false,
    },
    {
      title: "Buy and Hold 10K Wolfy",
      prize: "13M $Wolfy",
      image: "🐺",
      joined: true,
      joinedLabel: "Joined",
    },
    {
      title: "Buy and Hold 10K $Token",
      prize: "12M $Token",
      image: "🪙",
      joined: false,
    },
  ];

  const CampaignCard = ({
    title,
    prize,
    image,
    joined = false,
    joinedLabel,
  }: {
    title: string;
    prize: string;
    image: string;
    joined?: boolean;
    joinedLabel?: string;
  }) => (
    <div
      className="flex flex-col items-center gap-[15px] w-[342px]"
      style={{
        background: "#000000",
        borderRadius: "34px",
        padding: "14px 13px",
      }}
    >
      {/* Image placeholder */}
      <div
        className="w-[314px] h-[198px] overflow-hidden flex items-center justify-center"
        style={{ borderRadius: "34px", background: "#1B1B1B" }}
      >
        <span className="text-6xl">{image}</span>
      </div>

      {/* Title + Prize */}
      <div className="flex flex-col items-center gap-0">
        <span className="text-figma-white font-figma-bold text-figma-20 text-center">{title}</span>
        <span className="text-figma-white font-figma-regular text-figma-16 text-center mt-2">
          Prize pool: {prize}
        </span>
      </div>

      {/* CTA Button */}
      {joined ? (
        <div
          className="flex items-center justify-center w-[294px] h-[51px]"
          style={{
            background: "#6E44D2",
            borderRadius: "14px",
          }}
        >
          <span className="text-figma-card font-figma-semibold text-figma-16">{joinedLabel || "Joined"}</span>
        </div>
      ) : (
        <div
          className="flex items-center justify-center w-[294px] h-[51px]"
          style={{
            background: "#FFFFFF",
            borderRadius: "14px",
          }}
        >
          <span className="text-figma-card font-figma-semibold text-figma-16">View Campaign</span>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative" style={{ background: "#0E0E0E", minHeight: "1024px" }}>
      {/* Title */}
      <h1
        className="text-figma-white font-figma-bold"
        style={{ fontSize: "36px", paddingTop: "159px", marginLeft: "291px" }}
      >
        🎁 Rewards
      </h1>
      <p
        className="text-figma-green font-figma-medium text-figma-14"
        style={{ marginLeft: "291px", marginTop: "10px", maxWidth: "558px" }}
      >
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempura.
      </p>

      {/* ── Hold and Earn ── */}
      <h2
        className="text-figma-white font-figma-semibold"
        style={{ fontSize: "24px", marginLeft: "305px", marginTop: "82px" }}
      >
        🪙 Hold and Earn
      </h2>

      <div className="flex gap-[15px]" style={{ marginLeft: "291px", marginTop: "20px" }}>
        {holdCampaigns.map((campaign, i) => (
          <CampaignCard key={i} {...campaign} />
        ))}
      </div>

      {/* ── Airdrops ── */}
      <div className="flex items-center justify-between" style={{ marginRight: "291px" }}>
        <h2
          className="text-figma-white font-figma-semibold"
          style={{ fontSize: "24px", marginLeft: "305px", marginTop: "80px" }}
        >
          🪂 Airdrops
        </h2>
        <span className="text-figma-white font-figma-bold text-figma-16" style={{ marginTop: "80px" }}>
          View more
        </span>
      </div>

      <div className="flex gap-[15px]" style={{ marginLeft: "291px", marginTop: "20px", paddingBottom: "40px" }}>
        {airdropCampaigns.map((campaign, i) => (
          <CampaignCard key={i} {...campaign} />
        ))}
      </div>
    </div>
  );
}