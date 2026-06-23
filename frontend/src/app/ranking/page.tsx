"use client";

export default function RankingPage() {
  const rankings = [
    {
      title: "24h Trading Volume Ranking",
      columns: ["Token name /Symbol", "Market Cap", "24h Trading Vol"],
      rows: [
        { rank: 1, name: "Tokenname ($BRC)", mc: "$31,231M", vol: "$31,231M" },
        { rank: 2, name: "Tokenname ($UIS)", mc: "$24,500M", vol: "$24,500M" },
        { rank: 3, name: "Tokenname ($TOK)", mc: "$18,200M", vol: "$18,200M" },
      ],
    },
    {
      title: "Gainers Ranking",
      columns: ["Token name /Symbol", "Market Cap", "24h Trading Vol"],
      rows: [
        { rank: 1, name: "Tokenname ($BRC)", mc: "$31,231M", vol: "$31,231M" },
        { rank: 2, name: "Tokenname ($UIS)", mc: "$24,500M", vol: "$24,500M" },
        { rank: 3, name: "Tokenname ($TOK)", mc: "$18,200M", vol: "$18,200M" },
      ],
    },
    {
      title: "Market Cap Ranking",
      columns: ["Token name /Symbol", "Market Cap"],
      rows: [
        { rank: 1, name: "Tokenname ($BRC)", mc: "$31,231M" },
        { rank: 2, name: "Tokenname ($UIS)", mc: "$24,500M" },
        { rank: 3, name: "Tokenname ($TOK)", mc: "$18,200M" },
      ],
    },
    {
      title: "Almost There",
      columns: ["Token name /Symbol", "Market Cap", "24h Trading Vol"],
      rows: [
        { rank: 1, name: "Tokenname ($BRC)", mc: "$31,231M", vol: "$31,231M" },
        { rank: 2, name: "Tokenname ($UIS)", mc: "$24,500M", vol: "$24,500M" },
        { rank: 3, name: "Tokenname ($TOK)", mc: "$18,200M", vol: "$18,200M" },
      ],
    },
  ];

  const RankBadge = ({ rank }: { rank: number }) => {
    const badges = {
      1: (
        <svg width="26" height="31" viewBox="0 0 53 62" fill="none">
          <path d="M26.5 0L33 10L44.5 7L40 18L53 26L39.5 30L38 43L27 36L16 43L14.5 30L1 26L14 18L9.5 7L21 10L26.5 0Z" fill="#FFD700"/>
          <text x="26.5" y="38" textAnchor="middle" fill="#0E0E0E" fontSize="16" fontWeight="bold">1</text>
        </svg>
      ),
      2: (
        <svg width="26" height="31" viewBox="0 0 53 62" fill="none">
          <path d="M26.5 0L33 10L44.5 7L40 18L53 26L39.5 30L38 43L27 36L16 43L14.5 30L1 26L14 18L9.5 7L21 10L26.5 0Z" fill="#C0C0C0"/>
          <text x="26.5" y="38" textAnchor="middle" fill="#0E0E0E" fontSize="16" fontWeight="bold">2</text>
        </svg>
      ),
      3: (
        <svg width="26" height="31" viewBox="0 0 53 62" fill="none">
          <path d="M26.5 0L33 10L44.5 7L40 18L53 26L39.5 30L38 43L27 36L16 43L14.5 30L1 26L14 18L9.5 7L21 10L26.5 0Z" fill="#CD7F32"/>
          <text x="26.5" y="38" textAnchor="middle" fill="#0E0E0E" fontSize="16" fontWeight="bold">3</text>
        </svg>
      ),
    };
    return badges[rank as keyof typeof badges] || null;
  };

  const leftCol = rankings.slice(0, 2);
  const rightCol = rankings.slice(2);

  const RankingTable = ({
    title,
    columns,
    rows,
  }: {
    title: string;
    columns: string[];
    rows: { rank: number; name: string; mc: string; vol?: string }[];
  }) => (
    <div
      className="flex flex-col gap-[9px] w-[538px]"
      style={{
        background: "#000000",
        borderRadius: "20px",
        padding: "20px 24px",
      }}
    >
      {/* Title */}
      <span className="text-figma-white font-figma-bold text-figma-20">{title}</span>
      {/* Column headers */}
      <div className="flex items-center gap-[107px] h-[13px]">
        {columns.map((col, i) => (
          <span key={i} className="text-figma-green font-figma-light text-figma-11">
            {col}
          </span>
        ))}
      </div>
      {/* Rows */}
      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-[21px] w-full"
          style={{
            background: "#7DC832",
            borderRadius: "16px",
            padding: "9.5px 30px 9.5px 23px",
          }}
        >
          <RankBadge rank={row.rank} />
          <div className="flex items-center justify-between flex-1">
            <span className="text-figma-card font-figma-bold text-figma-12">{row.name}</span>
            <div className="flex items-center gap-8">
              <span className="text-figma-card font-figma-medium text-figma-12">{row.mc}</span>
              {row.vol && (
                <span className="text-figma-purple font-figma-medium text-figma-12">{row.vol}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      {/* Show more */}
      <div className="flex items-center justify-center w-full h-[31px] border border-white/25 rounded-[16px]">
        <span className="text-figma-white font-figma-regular text-figma-11">Show more</span>
      </div>
    </div>
  );

  return (
    <div className="bg-figma-bg min-h-screen px-5 pb-20">
      {/* Title */}
      <div className="pt-8 mb-4">
        <h1 className="text-figma-white font-bold text-[36px]">
          🏆 Ranking
        </h1>
        <p className="text-figma-green text-figma-md mt-2">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempura.
        </p>
      </div>

      {/* Network filter */}
      <div
        className="flex items-center gap-2 h-[31px] mb-8"
        style={{
          background: "#1B1B1B",
          borderRadius: "8px",
          width: "127px",
          padding: "7px 18px",
        }}
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="8" cy="8" r="7" fill="#F0B90B" />
          <path d="M8 2L10 4L8 6L6 4L8 2Z" fill="#0E0E0E" />
          <path d="M10 4L12 6L10 8L8 6L10 4Z" fill="#0E0E0E" />
          <path d="M6 4L8 6L6 8L4 6L6 4Z" fill="#0E0E0E" />
          <path d="M8 6L10 8L8 10L6 8L8 6Z" fill="#0E0E0E" />
        </svg>
        <span className="text-figma-white text-figma-12 font-figma-regular">BSC</span>
        <svg width="16" height="17" viewBox="0 0 16 17" fill="none">
          <path d="M4 6L8 10L12 6" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>

      {/* Ranking tables grid */}
      <div className="flex gap-[15px]">
        {/* Left column: 24h Volume + Gainers */}
        <div className="flex flex-col gap-[12px]">
          <RankingTable title={rankings[0].title} columns={rankings[0].columns} rows={rankings[0].rows} />
          <RankingTable title={rankings[1].title} columns={rankings[1].columns} rows={rankings[1].rows} />
        </div>
        {/* Right column: Market Cap + Almost There */}
        <div className="flex flex-col gap-[12px]">
          <RankingTable title={rankings[2].title} columns={rankings[2].columns} rows={rankings[2].rows} />
          <RankingTable title={rankings[3].title} columns={rankings[3].columns} rows={rankings[3].rows} />
        </div>
      </div>
    </div>
  );
}