import React from "react";

function Sk({ className = "", style = {} }) {
  return (
    <div
      className={`skeleton ${className}`}
      style={style}
    />
  );
}

function MediaCardSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      <Sk className="skeleton--card w-full" style={{ borderRadius: "16px" }} />
      <Sk className="skeleton--title" style={{ width: "75%" }} />
      <Sk className="skeleton--text" style={{ width: "55%" }} />
    </div>
  );
}

function ChartRowSkeleton() {
  return (
    <div
      className="flex items-center gap-4 px-4 py-3 rounded-2xl"
      style={{ backgroundColor: "var(--bg-hover)" }}
    >
      <Sk style={{ width: "28px", height: "14px", borderRadius: "6px" }} />
      <Sk className="skeleton--circle" style={{ width: "48px", height: "48px", flexShrink: 0 }} />
      <div className="flex flex-col gap-2 flex-1">
        <Sk className="skeleton--text" style={{ width: "65%" }} />
        <Sk className="skeleton--text" style={{ width: "45%" }} />
      </div>
      <Sk style={{ width: "50px", height: "14px", borderRadius: "6px" }} />
    </div>
  );
}

function MetricCardSkeleton() {
  return (
    <div
      className="metric-card flex flex-col gap-3"
      style={{ backgroundColor: "var(--bg-panel)" }}
    >
      <Sk className="skeleton--circle" style={{ width: "36px", height: "36px" }} />
      <Sk className="skeleton--title" style={{ width: "55%", marginTop: "8px" }} />
      <Sk className="skeleton--text" style={{ width: "75%" }} />
    </div>
  );
}

export default function PageSkeleton() {
  return (
    <div className="page" style={{ animation: "none" }}>
      {/* Hero skeleton */}
      <div className="page-hero" style={{ paddingTop: "8px" }}>
        <div className="flex flex-col gap-4">
          <Sk style={{ width: "160px", height: "13px", borderRadius: "8px" }} />
          <Sk style={{ width: "70%", height: "56px", borderRadius: "12px" }} />
          <Sk className="skeleton--text" style={{ width: "90%" }} />
          <Sk className="skeleton--text" style={{ width: "75%" }} />
          <div className="flex gap-3 mt-2">
            <Sk style={{ width: "140px", height: "46px", borderRadius: "16px" }} />
            <Sk style={{ width: "110px", height: "46px", borderRadius: "16px" }} />
          </div>
        </div>
        <div className="surface-panel flex flex-col gap-3">
          <Sk className="skeleton--title" style={{ width: "50%" }} />
          {[...Array(4)].map((_, i) => <ChartRowSkeleton key={i} />)}
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="metric-grid">
        {[...Array(3)].map((_, i) => <MetricCardSkeleton key={i} />)}
      </div>

      {/* Media grid skeleton */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <Sk className="skeleton--title" style={{ width: "180px" }} />
          <Sk style={{ width: "60px", height: "12px", borderRadius: "6px" }} />
        </div>
        <div className="media-grid">
          {[...Array(6)].map((_, i) => <MediaCardSkeleton key={i} />)}
        </div>
      </div>

      {/* Second media grid */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <Sk className="skeleton--title" style={{ width: "140px" }} />
          <Sk style={{ width: "60px", height: "12px", borderRadius: "6px" }} />
        </div>
        <div className="media-grid">
          {[...Array(3)].map((_, i) => <MediaCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
