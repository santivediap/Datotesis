import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, ResponsiveContainer, Tooltip, Customized } from "recharts";
import type { GalaxyPoint } from "@/lib/mockData";

interface Props {
  points: GalaxyPoint[];
  xLabel: string;
  yLabel: string;
  stats?: { rows: number; clusters: number; noise_pct: number; noise_count?: number; clustered_count?: number };
  boundaries?: Record<string, { x: number, y: number }[]>;
  top_clusters?: number[];
  cluster_stats?: Record<string, { nombre: string; metricas: Record<string, number> }>;
}

const COLOR_PALETTE = ["#3B82F6", "#d4d406ff", "#8B5CF6", "#EC4899", "#10B981"]; // Azul, Amarillo, Violeta, Rosa, Verde
const COLOR_OTROS = "#4B5563";
const COLOR_RUIDO = "#1C1C1E";

const PointShape = (props: any) => {
  const { cx, cy, payload } = props;
  const color = payload.color ?? COLOR_OTROS;

  if (payload.cluster === -1) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={2}
        fill={color}
        opacity={0.4}
      />
    );
  }

  const w = payload.size_weight ?? 0.5;
  const radius = 2 + (w * 6);

  return (
    <circle
      cx={cx}
      cy={cy}
      r={radius}
      fill={color}
      opacity={0.2}
      style={{ mixBlendMode: 'screen' }}
    />
  );
};

const CustomTooltip = ({ active, payload, clusterStats }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const clusterId = data.cluster;

    const statsData = clusterStats?.[String(clusterId)];
    const title = statsData?.nombre || (clusterId === -1 ? "Ruido" : `Clúster ${clusterId}`);

    return (
      <div className="rounded-md border border-border-strong bg-surface-2 p-3 shadow-[0_8px_24px_-8px_hsl(0_0%_0%_/_0.6)] text-[11px] font-mono min-w-[160px]">
        <p className="font-semibold text-foreground mb-2 border-b border-border pb-1.5">{title}</p>

        {statsData && statsData.metricas ? (
          <div className="flex flex-col gap-1.5 mb-2">
            {Object.entries(statsData.metricas).map(([key, val]) => (
              <div key={key} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{key}:</span>
                <span className="text-foreground font-medium">{Number(val).toFixed(2)}</span>
              </div>
            ))}
          </div>
        ) : null}

        <div className="flex items-center gap-2 pt-2 border-t border-border/50 text-[9px] text-muted-foreground/60">
          <span>x:{data.x.toFixed(2)}</span>
          <span>y:{data.y.toFixed(2)}</span>
        </div>
      </div>
    );
  }
  return null;
};

const BoundariesLayer = (props: any) => {
  const { xAxisMap, yAxisMap, boundaries, getColor } = props;
  if (!xAxisMap || !yAxisMap || !boundaries) return null;

  const xAxis = Object.values(xAxisMap)[0] as any;
  const yAxis = Object.values(yAxisMap)[0] as any;
  if (!xAxis || !yAxis) return null;

  const xScale = xAxis.scale;
  const yScale = yAxis.scale;

  return (
    <g className="cluster-boundaries pointer-events-none">
      {Object.entries(boundaries).map(([clusterKey, pts]: [string, any]) => {
        const cId = parseInt(clusterKey.replace("cluster_", ""));
        const color = getColor(cId);
        const pointsStr = pts.map((p: any) => `${xScale(p.x)},${yScale(p.y)}`).join(" ");

        return (
          <polygon
            key={clusterKey}
            points={pointsStr}
            fill={color}
            fillOpacity={0.03}
            stroke={color}
            strokeWidth={1.5}
            strokeOpacity={0.4}
            strokeDasharray="4 4"
            style={{ filter: 'blur(1px)' }}
          />
        );
      })}
    </g>
  );
};

export default function GalaxyChart({ points, xLabel, yLabel, stats, boundaries, top_clusters, cluster_stats }: Props) {
  // Color Mapping
  const colorMap = new Map<number, string>();
  if (top_clusters) {
    top_clusters.forEach((cId, idx) => {
      colorMap.set(cId, COLOR_PALETTE[idx % COLOR_PALETTE.length]);
    });
  }

  const getColor = (clusterId: number) => {
    if (clusterId === -1) return COLOR_RUIDO;
    if (colorMap.has(clusterId)) return colorMap.get(clusterId)!;
    return COLOR_OTROS;
  };

  const pointsWithColors = points.map(p => ({
    ...p,
    color: getColor(p.cluster)
  }));

  const byCluster = new Map<number, GalaxyPoint[]>();
  pointsWithColors.forEach((p) => {
    const arr = byCluster.get(p.cluster) ?? [];
    arr.push(p);
    byCluster.set(p.cluster, arr);
  });

  const clustered = pointsWithColors.filter((p) => p.cluster !== -1);
  const noise = pointsWithColors.filter((p) => p.cluster === -1);

  // Legend shows top clusters + "Otros"
  const legendItems = (top_clusters || [...byCluster.keys()])
    .filter((c) => c !== -1)
    .slice(0, 5)
    .sort((a, b) => a - b)
    .map((c) => ({ label: `CLUSTER_${c}`, color: getColor(c) }));

  if (byCluster.size > (top_clusters ? top_clusters.length : 5) || [...byCluster.keys()].some(c => c !== -1 && !colorMap.has(c))) {
    if (!legendItems.find(l => l.label === "OTROS")) {
      legendItems.push({ label: "OTROS", color: COLOR_OTROS });
    }
  }

  return (
    <div className="glass-card p-6 h-full flex flex-col snap-in">
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground mb-1">
            RELACIÓN_CRÍTICA
          </p>
          <h2 className="text-xl font-semibold tracking-tight">Mapa de clústeres</h2>
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
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ background: COLOR_RUIDO, boxShadow: `0 0 6px ${COLOR_RUIDO}` }}
            />
            RUIDO
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
              domain={['auto', 'auto']}
              tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={['auto', 'auto']}
              tick={{ fontFamily: "JetBrains Mono", fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
            />
            <ZAxis range={[60, 60]} />
            <Tooltip
              cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1, strokeDasharray: "3 3" }}
              content={<CustomTooltip clusterStats={cluster_stats} />}
            />
            <Customized component={(props) => <BoundariesLayer {...props} boundaries={boundaries} getColor={getColor} />} />
            <Scatter data={clustered} shape={<PointShape />} />
            <Scatter data={noise} shape={<PointShape />} />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 font-mono text-[10px]">
        <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 flex items-center justify-between">
          <span className="text-muted-foreground tracking-wider">N_TOTAL</span>
          <span className="font-semibold text-foreground">{stats?.rows ?? points.length}</span>
        </div>
        <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 flex items-center justify-between">
          <span className="text-muted-foreground tracking-wider">AGRUPADOS</span>
          <span className="font-semibold text-primary">{stats?.clustered_count ?? clustered.length}</span>
        </div>
        <div className="rounded-md border border-border bg-surface-2/60 px-3 py-2 flex items-center justify-between">
          <span className="text-muted-foreground tracking-wider">RUIDO</span>
          <span className="font-semibold text-muted-foreground">{stats?.noise_count ?? noise.length}</span>
        </div>
      </div>
    </div>
  );
}
