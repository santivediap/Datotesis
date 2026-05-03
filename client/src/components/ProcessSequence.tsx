import { useEffect } from "react";

const STAGES = [
  { label: "CLEANING", desc: "Normalizing dataset" },
  { label: "CLUSTERING", desc: "HDBSCAN partition" },
  { label: "VALIDATING", desc: "Silhouette scoring" },
  { label: "INSIGHT", desc: "LLM synthesis" },
] as const;

interface Props {
  activeStage: number;
  fileName: string;
}

export default function ProcessSequence({ activeStage, fileName }: Props) {
  return (
    <div className="glass-card relative overflow-hidden p-6 snap-in">
      <div className="progress-track" />

      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2">
          <span className="status-dot text-primary bg-primary" />
          <p className="font-mono text-[11px] tracking-[0.2em] text-foreground/90">
            AGENT_CORE_EXECUTING<span className="text-muted-foreground">…</span>
          </p>
        </div>
        <p className="font-mono text-[10px] text-muted-foreground tracking-wider">
          {fileName} · STAGE {Math.min(activeStage + 1, STAGES.length)}/{STAGES.length}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {STAGES.map((stage, i) => {
          const isActive = i === activeStage;
          const isDone = i < activeStage;
          return (
            <div
              key={stage.label}
              className={[
                "relative rounded-md border px-4 py-3 transition-all",
                isActive
                  ? "border-primary/40 bg-primary/5 agent-pulse"
                  : isDone
                    ? "border-border-strong bg-surface-2/80"
                    : "border-border bg-surface-1/40 opacity-60",
              ].join(" ")}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
                {isDone && (
                  <span className="font-mono text-[10px] text-accent-emerald">✓</span>
                )}
                {isActive && (
                  <span className="status-dot text-primary bg-primary" />
                )}
              </div>
              <p className="font-mono text-[12px] font-semibold tracking-wider text-foreground">
                {stage.label}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {stage.desc}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
