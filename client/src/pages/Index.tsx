import { useState, useRef, useEffect } from "react";
import { Sparkles } from "lucide-react";
import UploadZone from "@/components/UploadZone";
import GalaxyChart from "@/components/GalaxyChart";
import InsightCard from "@/components/InsightCard";
import ProcessSequence from "@/components/ProcessSequence";
import type { AnalysisResult } from "@/lib/mockData";

const STAGE_MAP: Record<string, number> = {
  "INGESTING": 0,
  "CLEANING": 1,
  "VALIDATING": 2,
  "GENERATING_INSIGHTS": 3,
};

const Index = () => {
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [activeStage, setActiveStage] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const handleFileSelect = (name: string, fileText: string) => {
    setFileName(name);
    setProcessing(true);
    setActiveStage(0);
    setResult(null);

    const ws = new WebSocket("ws://localhost:8000/ws/analyze");
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(fileText);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "STATUS") {
          const stageIdx = STAGE_MAP[data.stage];
          if (stageIdx !== undefined) {
            setActiveStage(stageIdx);
          }
        } else if (data.type === "FINAL_RESULT") {
          // Map backend payload to Lovable's expected AnalysisResult
          const mappedResult: AnalysisResult = {
            galaxy: {
              x_axis_label: data.axes?.x_label || "X",
              y_axis_label: data.axes?.y_label || "Y",
              points: (data.topology || []).map((p: any, i: number) => ({
                x: p.x,
                y: p.y,
                cluster: p.cluster,
                id: `p_${i}`,
              })),
            },
            insight: {
              title: `INSIGHT // GEMINI_v2 // CONF: ${((data.insight?.confidence_score || 0) * 100).toFixed(0)}%`,
              finding: data.insight?.finding || "",
              golden_rule: data.insight?.golden_rule || "",
            },
            radar: [], // Radar removed as per user request
            stats: {
              rows: data.stats?.n_total || 0,
              clusters: data.stats?.clustered ? Array.from(new Set(data.topology.filter((p: any) => p.cluster !== -1).map((p: any) => p.cluster))).length : 0,
              noise_pct: data.stats?.n_total ? Math.round((data.stats.noise / data.stats.n_total) * 100) : 0,
            },
          };
          
          setResult(mappedResult);
          setProcessing(false);
        } else if (data.type === "ERROR") {
          console.error("Backend Error:", data.message);
          setProcessing(false);
        }
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket Error:", err);
      setProcessing(false);
    };
  };

  const reset = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setResult(null);
    setFileName("");
    setProcessing(false);
    setActiveStage(0);
  };

  return (
    <main className="min-h-screen text-foreground">
      {/* GLASS NAV */}
      <header className="glass-nav sticky top-0 z-50 px-6 md:px-10 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-gradient-to-br from-primary to-accent-violet flex items-center justify-center shadow-[0_0_20px_-4px_hsl(var(--primary))]">
            <Sparkles className="w-3.5 h-3.5 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <div className="flex items-baseline gap-2">
            <h1 className="text-[15px] font-semibold tracking-tight">Research Agent</h1>
            <span className="font-mono text-[10px] text-muted-foreground">v1.0</span>
          </div>
        </div>
        <nav className="hidden md:flex items-center gap-6 font-mono text-[11px] text-muted-foreground">
          <a className="hover:text-foreground transition-colors">Datasets</a>
          <a className="hover:text-foreground transition-colors">Agents</a>
          <a className="hover:text-foreground transition-colors">Docs</a>
        </nav>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-md border border-border bg-surface-1/60 font-mono text-[10px] tracking-wider">
            <span className={`status-dot ${result ? "text-accent-emerald bg-accent-emerald" : processing ? "text-primary bg-primary" : "text-accent-amber bg-accent-amber"}`} />
            {result ? "READY" : processing ? "PROCESSING" : "IDLE"}
          </div>
          <button className="btn-premium rounded-md px-3 py-1.5 text-[12px] font-medium">
            Sign in
          </button>
        </div>
      </header>

      <div className="px-6 md:px-10 py-10 max-w-[1400px] mx-auto">
        {/* HERO STRIP */}
        <section className="mb-8 snap-in">
          <p className="font-mono text-[10px] tracking-[0.25em] text-muted-foreground mb-3">
            CLUSTERING · LLM_INSIGHT · GEMINI_v2
          </p>
          <h2 className="text-3xl md:text-4xl font-semibold tracking-[-0.025em] max-w-2xl">
            Turn raw datasets into{" "}
            <span className="bg-gradient-to-r from-primary via-accent-violet to-accent-cyan bg-clip-text text-transparent">
              decisive insights
            </span>
            .
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl text-[15px] leading-relaxed">
            Upload a file. The agent cleans, clusters, validates and synthesizes a golden rule — in seconds.
          </p>
        </section>

        {/* UPLOAD / STATUS */}
        <section className="mb-6">
          {!result && !processing ? (
            <UploadZone onFileSelect={handleFileSelect} />
          ) : processing ? (
            <ProcessSequence activeStage={activeStage} fileName={fileName} />
          ) : (
            <div className="glass-card px-5 py-3.5 flex items-center justify-between snap-in">
              <div className="flex items-center gap-5 font-mono text-[11px] text-muted-foreground tracking-wider flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span className="status-dot text-accent-emerald bg-accent-emerald" />
                  <span className="text-foreground">{fileName}</span>
                </span>
                <span>ROWS · <span className="text-foreground">{result?.stats.rows}</span></span>
                <span>CLUSTERS · <span className="text-foreground">{result?.stats.clusters}</span></span>
                <span>NOISE · <span className="text-foreground">{result?.stats.noise_pct}%</span></span>
              </div>
              <button
                onClick={reset}
                className="btn-premium rounded-md px-3 py-1.5 text-[12px] font-medium"
              >
                New dataset
              </button>
            </div>
          )}
        </section>

        {/* BENTO RESULTS */}
        {result && (
          <section className="grid grid-cols-1 lg:grid-cols-10 gap-5">
            {/* Hero — 70% */}
            <div className="lg:col-span-7">
              <GalaxyChart
                points={result.galaxy.points}
                xLabel={result.galaxy.x_axis_label}
                yLabel={result.galaxy.y_axis_label}
              />
            </div>
            {/* Insight — 30%, vertical */}
            <div className="lg:col-span-3">
              <InsightCard
                title={result.insight.title}
                finding={result.insight.finding}
                goldenRule={result.insight.golden_rule}
              />
            </div>
          </section>
        )}

        <footer className="mt-16 pt-6 border-t border-border flex items-center justify-between font-mono text-[10px] text-muted-foreground tracking-wider">
          <span>© RESEARCH_AGENT</span>
          <span>BUILD · 2026.04.30</span>
        </footer>
      </div>
    </main>
  );
};

export default Index;
