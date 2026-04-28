import React from "react";

function Sk({ style = {} }) {
  return <div className="skeleton" style={{ height: "12px", ...style }} />;
}

function ChartRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl" style={{ backgroundColor: "var(--bg-hover)" }}>
      <Sk style={{ width: "24px", height: "12px" }} />
      <Sk style={{ width: "40px", height: "40px", borderRadius: "8px", flexShrink: 0 }} />
      <div className="flex flex-col gap-2 flex-1">
        <Sk style={{ width: "60%" }} />
        <Sk style={{ width: "40%" }} />
      </div>
      <Sk style={{ width: "40px", height: "12px" }} />
    </div>
  );
}

function MediaCardSkeleton() {
  return (
    <div className="flex flex-col gap-2">
      <Sk style={{ width: "100%", aspectRatio: "1", borderRadius: "12px" }} />
      <Sk style={{ width: "70%" }} />
      <Sk style={{ width: "50%" }} />
    </div>
  );
}

export default function PageSkeleton() {
  return (
    <div className="space-y-8 animate-fade">
      {/* Hero skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-3">
          <Sk style={{ width: "140px", height: "12px", borderRadius: "6px" }} />
          <Sk style={{ width: "60%", height: "40px", borderRadius: "8px" }} />
          <Sk style={{ width: "80%" }} />
          <Sk style={{ width: "65%" }} />
          <div className="flex gap-2 mt-1">
            <Sk style={{ width: "120px", height: "36px", borderRadius: "8px" }} />
            <Sk style={{ width: "90px", height: "36px", borderRadius: "8px" }} />
          </div>
        </div>
        <div className="flex flex-col gap-3 p-5 rounded-2xl" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
          <Sk style={{ width: "50%", height: "16px" }} />
          {[...Array(4)].map((_, i) => <ChartRowSkeleton key={i} />)}
        </div>
      </div>

      {/* Metrics skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="p-4 rounded-xl flex flex-col gap-3" style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--surface-line)" }}>
            <Sk style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
            <Sk style={{ width: "50%", height: "20px" }} />
            <Sk style={{ width: "70%" }} />
          </div>
        ))}
      </div>

      {/* Media grid skeleton */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Sk style={{ width: "160px", height: "16px" }} />
          <Sk style={{ width: "50px", height: "10px" }} />
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
          {[...Array(6)].map((_, i) => <MediaCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}
