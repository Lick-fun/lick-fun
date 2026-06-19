"use client";

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { TradeEntity } from "@/lib/graphql/queries";

interface CurveChartProps {
  trades: TradeEntity[];
  graduated: boolean;
  realMon: bigint;
}

export function CurveChart({ trades, graduated, realMon }: CurveChartProps) {
  const data = useMemo(() => {
    if (trades.length === 0) return [];

    let runningMon = 0n;
    const points: { time: number; mon: number }[] = [];

    // Synthetic starting point
    points.push({ time: Number(trades[0].blockTimestamp) - 1, mon: 0 });

    for (const trade of trades) {
      if (trade.isBuy) {
        runningMon += trade.amountIn;
      } else {
        runningMon -= trade.amountOut;
      }
      if (runningMon < 0n) runningMon = 0n;
      points.push({
        time: Number(trade.blockTimestamp),
        mon: Number(runningMon) / 1e18,
      });
    }

    // Make sure the last point reflects current realMon (from chain, not just trades)
    if (points.length > 0) {
      const currentMon = Number(realMon) / 1e18;
      if (Math.abs(points[points.length - 1].mon - currentMon) > 1) {
        points.push({
          time: points[points.length - 1].time,
          mon: currentMon,
        });
      }
    }

    return points;
  }, [trades, realMon]);

  if (data.length < 2) {
    return (
      <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
        Not enough trade data for chart
      </div>
    );
  }

  const threshold = 100; // 100K MON
  const maxMon = Math.max(data[data.length - 1].mon, threshold) * 1.1;

  return (
    <ResponsiveContainer width="100%" height={256}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="time"
          type="number"
          domain={["dataMin", "dataMax"]}
          tickFormatter={(t) => {
            const d = new Date(t * 1000);
            return `${d.getMonth() + 1}/${d.getDate()}`;
          }}
          stroke="hsl(30, 10%, 40%)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          domain={[0, maxMon]}
          tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
          stroke="hsl(30, 10%, 40%)"
          fontSize={11}
          tickLine={false}
          axisLine={false}
          width={50}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(20, 15%, 8%)",
            border: "1px solid hsl(20, 15%, 18%)",
            borderRadius: "8px",
            fontSize: "12px",
          }}
          labelFormatter={(t) =>
            new Date(Number(t) * 1000).toLocaleDateString()
          }
          formatter={(value: number) => [`${value.toFixed(1)} MON`, "Raised"]}
        />
        <ReferenceLine
          y={threshold}
          stroke="hsl(25, 95%, 55%)"
          strokeDasharray="4 4"
          strokeWidth={1}
          label={{
            value: "100K Graduation",
            fill: "hsl(25, 95%, 55%)",
            fontSize: 11,
            position: "insideTopRight",
          }}
        />
        <Line
          type="monotone"
          dataKey="mon"
          stroke={graduated ? "hsl(150, 60%, 45%)" : "hsl(25, 95%, 55%)"}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4, fill: "hsl(25, 95%, 55%)" }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}