import React from "react";

function CoverArt({ art, compact = false }) {
  const normalized =
    typeof art === "string"
      ? { image: art, colors: ["#111827", "#0b1220"] }
      : art || null;

  const colors = normalized?.colors || ["#e9e3d5", "#b7c2d1"];
  const style = {
    background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})`,
  };

  return (
    <div
      className={`cover-art${compact ? " cover-art--compact" : ""}`}
      style={style}
      aria-hidden="true"
    >
      {normalized?.image ? (
        <img
          src={normalized.image}
          alt=""
          className="cover-art__image"
          loading="lazy"
        />
      ) : null}
      <span className="cover-art__stamp">{normalized?.stamp || "Bozia"}</span>
      <span className="cover-art__mono">{normalized?.mono || "BM"}</span>
      <span className="cover-art__shine" />
    </div>
  );
}

export default CoverArt;
