import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { GalaxyPoint } from "@/lib/mockData";

interface Props {
  points: GalaxyPoint[];
  xLabel: string;
  yLabel: string;
}

const CLUSTER_COLORS: Record<number, string> = {
  0: "hsl(var(--cluster-0))",
  1: "hsl(var(--cluster-1))",
  2: "hsl(var(--cluster-2))",
};

const PointShape = (props: any) => {
  const { cx, cy, payload } = props;
  if (payload.cluster === -1) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2}
        fill="hsl(var(--cluster-noise))"
        opacity={0.5}
      />
    );
  }
  const color = CLUSTER_COLORS[payload.cluster] ?? "hsl(var(--primary))";
  return (
    <g>
      {/* outer glow */}
      <circle cx={cx} cy={cy} r={9} fill={color} opacity={0.12} />
      <circle cx={cx} cy={cy} r={5} fill={color} opacity={0.28} />
      {/* core */}
      <circle cx={cx} cy={cy} r={3} fill={color} />
      <circle cx={cx} cy={cy} r={1.2} fill="hsl(0 0% 100%)" opacity={0.9} />
    </g>
  );
};

export default function GalaxyChart({ points, xLabel, yLabel }: Props) {
  const byCluster = new Map<number, GalaxyPoint[]>();
  points.forEach((p) => {
    const arr = byCluster.get(p.cluster) ?? [];
    arr.push(p);
    byCluster.set(p.cluster, arr);
  });
  const clustered = points.filter((p) => p.cluster !== -1);
  const noise = points.filter((p) => p.cluster === -1);

  const legendItems = [...byCluster.keys()]
    .filter((c) => c !== -1)
    .sort((a, b) => a - b)
    .map((c) => ({ label: `CLUSTER_${c}`, color: CLUSTER_COLORS[c] }));

  return (
    <div className="glass-card p-6 h-full flex flex-col snap-in">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mb-1">
            STRATEGIC_CUT / SCATTER
          </p>
          <h2 className="text-xl font-semibold tracking-tight">Cluster topology</h2>
        </div>
        <div className="flex items-center gap-4 font-mono text-[10px] text-muted-foreground">
          {legendItems.map((l) => (
            <span key={l.label} className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ background: l.color, boxShadow: `0 0 6px ${l.color}` }}
              />
              {l.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 opacity-70">
            <span className="w-1.5 h-1.5 rounded-full bg-cluster-noise" />
            NOISE
          </span>
        </div>
      </div>

      <div className="relative flex-1 min-h-[440px] mt-4 rounded-md border border-border/60 bg-background/40">
        <div className="absolute top-3 left-4 font-mono text-[10px] text-muted-foreground tracking-wider z-10">
          y · {yLabel}
        </div>
        <div className="absolute bottom-3 right-4 font-mono text-[10px] text-muted-foreground tracking-wider z-10">
          {xLabel} · x
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 24, right: 28, bottom: 28, left: 24 }}>
            <XAxis
              type="number"
              dataKey="x"
              domain={[0, 10]}
              tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[0, 10]}
              tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
              contentStyle={{
                background: "hsl(var(--surface-2))",
                border: "1px solid hsl(var(--border-strong))",
                borderRadius: 8,
                fontFamily: "JetBrains Mono",
                fontSize: 11,
                color: "hsl(var(--foreground))",
                boxShadow: "0 8px 24px -8px hsl(0 0% 0% / 0.6)",
              }}
              labelStyle={{ color: "hsl(var(--muted-foreground))" }}
              formatter={(value: any, name: string) => [Number(value).toFixed(2), name]}
            />
            <Scatter data={clustered} shape={<PointShape />} />
            <Scatter data={noise} shape={<PointShape />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px]">
        <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 flex items-center justify-between">
          <span className="text-muted-foreground tracking-wider">N_TOTAL</span>
          <span className="font-semibold text-foreground">{points.length}</span>
        </div>
        <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 flex items-center justify-between">
          <span className="text-muted-foreground tracking-wider">CLUSTERED</span>
          <span className="font-semibold text-primary">{clustered.length}</span>
        </div>
        <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 flex items-center justify-between">
          <span className="text-muted-foreground tracking-wider">NOISE</span>
          <span className="font-semibold text-muted-foreground">{noise.length}</span>
        </div>
      </div>
    </div>
  );
}
