import React from "react";
import {
  LayoutGrid,
  Play,
  Repeat2,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
} from "./Icons";
import CoverArt from "./CoverArt";

function formatTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) ? seconds : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;

  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function Player({ track }) {
  const progress = track?.progress ?? 96;
  const duration = track?.duration ?? 251;
  const elapsedSeconds = Math.round((progress / 100) * duration);

  return (
    <footer className="player-bar">
      <div className="player-bar__track">
        <CoverArt art={track?.art} compact />
        <div>
          <p className="player-bar__title">{track?.title || "Bozia Mix"}</p>
          <p className="player-bar__subtitle">
            {track?.artist || "BoziaMusic Originals"}
          </p>
        </div>
      </div>

      <div className="player-bar__controls">
        <div className="player-bar__meters" aria-hidden="true">
          {[10, 20, 18, 26, 12, 30, 16, 24].map((height, index) => (
            <span
              key={`${track?.title || "mix"}-${index}`}
              className="player-bar__meter"
              style={{ height }}
            />
          ))}
        </div>

        <div className="player-bar__buttons">
          <button type="button" className="player-icon-button" aria-label="Poprzedni utwór">
            <SkipBack size={18} />
          </button>
          <button
            type="button"
            className="player-icon-button player-icon-button--primary"
            aria-label="Odtwórz"
          >
            <Play size={20} fill="currentColor" />
          </button>
          <button type="button" className="player-icon-button" aria-label="Następny utwór">
            <SkipForward size={18} />
          </button>
        </div>

        <div className="player-bar__timeline">
          <span>{formatTime(elapsedSeconds)}</span>
          <div className="player-progress" aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <div className="player-bar__actions">
        <button type="button" className="player-icon-button" aria-label="Losowo">
          <Shuffle size={18} />
        </button>
        <button type="button" className="player-icon-button" aria-label="Powtarzaj">
          <Repeat2 size={18} />
        </button>
        <button type="button" className="player-icon-button" aria-label="Układ">
          <LayoutGrid size={18} />
        </button>
        <div className="player-volume" aria-hidden="true">
          <Volume2 size={18} />
          <div className="player-volume__track">
            <span style={{ width: `${track?.volume ?? 64}%` }} />
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Player;
