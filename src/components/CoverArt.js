import React from "react";

function CoverArt({ art, compact = false }) {
  const colors = art?.colors || ["#e9e3d5", "#b7c2d1"];
  const style = {
    background: `linear-gradient(145deg, ${colors[0]}, ${colors[1]})`,
  };

  return (
    <div
      className={`cover-art${compact ? " cover-art--compact" : ""}`}
      style={style}
      aria-hidden="true"
    >
      {art?.image ? (
        <img
          src={art.image}
          alt=""
          className="cover-art__image"
          loading="lazy"
        />
      ) : null}
      <span className="cover-art__stamp">{art?.stamp || "Bozia"}</span>
      <span className="cover-art__mono">{art?.mono || "BM"}</span>
      <span className="cover-art__shine" />
    </div>
  );
}

export default CoverArt;
