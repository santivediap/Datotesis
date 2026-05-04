// Mock API response shape — mimics the backend payload structure
export type GalaxyPoint = {
  x: number;
  y: number;
  cluster: number;
  size_weight: number;
  id: string;
};

export type RadarVar = {
  variable: string;
  best: number;   // best-performing cluster value (0-100)
  base: number;   // baseline cluster value (0-100)
};

export type AnalysisResult = {
  galaxy: {
    x_axis_label: string;
    y_axis_label: string;
    points: GalaxyPoint[];
    boundaries: Record<string, {x: number, y: number}[]>;
    top_clusters: number[];
  };
  cluster_stats: Record<string, { nombre: string; metricas: Record<string, number> }>;
  insight: {
    title: string;
    finding: string;
    golden_rule: string;
  };
  radar: RadarVar[];
  stats: {
    rows: number;
    clusters: number;
    noise_pct: number;
    noise_count?: number;
    clustered_count?: number;
  };
};

const rand = (min: number, max: number) => Math.random() * (max - min) + min;

function makeCluster(cx: number, cy: number, n: number, cluster: number, spread = 1.2): GalaxyPoint[] {
  return Array.from({ length: n }, (_, i) => ({
    x: cx + (Math.random() - 0.5) * spread * 2,
    y: cy + (Math.random() - 0.5) * spread * 2,
    cluster,
    id: `c${cluster}_${i}`,
  }));
}

export function generateMockResult(): AnalysisResult {
  const points: GalaxyPoint[] = [
    ...makeCluster(2.5, 7.0, 28, 0, 1.4),
    ...makeCluster(7.5, 4.5, 32, 1, 1.6),
    ...makeCluster(5.0, 2.0, 22, 2, 1.2),
    // noise
    ...Array.from({ length: 18 }, (_, i) => ({
      x: rand(0, 10),
      y: rand(0, 10),
      cluster: -1,
      id: `n_${i}`,
    })),
  ];

  return {
    galaxy: {
      x_axis_label: "ENGAGEMENT_SCORE",
      y_axis_label: "RETENTION_INDEX",
      points,
    },
    insight: {
      title: "INSIGHT // GEMINI_v2",
      finding:
        "Cluster 0 concentrates 28% of records but generates 61% of total retention value. The relationship between engagement and retention is non-linear above the 6.5 threshold.",
      golden_rule:
        "Prioritize segments with ENGAGEMENT_SCORE > 6.5 — they convert 3.2x more reliably than the baseline.",
    },
    radar: [
      { variable: "FREQUENCY", best: 88, base: 42 },
      { variable: "RECENCY", best: 76, base: 51 },
      { variable: "VALUE", best: 92, base: 38 },
      { variable: "DEPTH", best: 64, base: 49 },
      { variable: "BREADTH", best: 81, base: 55 },
      { variable: "LOYALTY", best: 95, base: 33 },
    ],
    stats: {
      rows: points.length,
      clusters: 3,
      noise_pct: Math.round((18 / points.length) * 100),
    },
  };
}
