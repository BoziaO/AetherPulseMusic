import React from "react";

function IconBase({
  size = 24,
  strokeWidth = 2,
  fill = "none",
  children,
  ...props
}) {
  return (
    <svg
      aria-hidden="true"
      fill={fill}
      height={size}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={strokeWidth}
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {children}
    </svg>
  );
}

export function ArrowRight(props) {
  return (
    <IconBase {...props}>
      <path d="M5 12h14" />
      <path d="m13 5 7 7-7 7" />
    </IconBase>
  );
}

export function BadgeCheck(props) {
  return (
    <IconBase {...props}>
      <path d="m9.2 3.3 1 .9 1.4-.2 1 .9 1.4.3.7 1.2 1.3.6.3 1.4 1 1-.2 1.4.7 1.2-.6 1.3.2 1.4-1 1-.3 1.4-1.3.6-.7 1.2-1.4.3-1 .9-1.4-.2-1 .9-1.4-.3-.7-1.2-1.3-.6-.3-1.4-1-1 .2-1.4-.7-1.2.6-1.3-.2-1.4 1-1 .3-1.4 1.3-.6.7-1.2z" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

export function Bell(props) {
  return (
    <IconBase {...props}>
      <path d="M6 9a6 6 0 1 1 12 0c0 5 2 6 2 6H4s2-1 2-6" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </IconBase>
  );
}

export function BookImage(props) {
  return (
    <IconBase {...props}>
      <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 0 4 23z" />
      <path d="M8 7h8" />
      <path d="m8 15 2.5-3 2 2 2.5-3 3 4" />
      <circle cx="15" cy="8.5" r="1.2" />
    </IconBase>
  );
}

export function Compass(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m15.5 8.5-2.7 6.2-6.3 2.8 2.8-6.3z" />
    </IconBase>
  );
}

export function Flame(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3c2 2 3 3.8 3 6a3 3 0 0 1-6 0c0-1.4.6-2.7 1.8-4.1A8.4 8.4 0 0 0 7 13a5 5 0 0 0 10 0c0-3.5-1.8-6.7-5-10" />
    </IconBase>
  );
}

export function HeartHandshake(props) {
  return (
    <IconBase {...props}>
      <path d="M8.3 6.2a4 4 0 0 0-5.3 6l9 8.1 9-8.1a4 4 0 1 0-5.3-6L12 9 8.3 6.2z" />
      <path d="m8.5 12 2.2 2.2a1.5 1.5 0 0 0 2.1 0l2.2-2.2" />
    </IconBase>
  );
}

export function LayoutGrid(props) {
  return (
    <IconBase {...props}>
      <rect width="7" height="7" x="3" y="3" rx="1" />
      <rect width="7" height="7" x="14" y="3" rx="1" />
      <rect width="7" height="7" x="3" y="14" rx="1" />
      <rect width="7" height="7" x="14" y="14" rx="1" />
    </IconBase>
  );
}

export function LibraryBig(props) {
  return (
    <IconBase {...props}>
      <path d="M4 21h16" />
      <path d="M6 18V5l4-2v15" />
      <path d="M10 18V5l4-2v15" />
      <path d="M14 18V5l4-2v15" />
    </IconBase>
  );
}

export function ListMusic(props) {
  return (
    <IconBase {...props}>
      <path d="M4 8h10" />
      <path d="M4 12h10" />
      <path d="M4 16h6" />
      <path d="M18 7v8.5a1.5 1.5 0 1 1-1-1.4V6l4-1v8.5a1.5 1.5 0 1 1-1-1.4" />
    </IconBase>
  );
}

export function Mic2(props) {
  return (
    <IconBase {...props}>
      <path d="M12 14a3 3 0 0 0 3-3V7a3 3 0 1 0-6 0v4a3 3 0 0 0 3 3Z" />
      <path d="M19 11a7 7 0 0 1-14 0" />
      <path d="M12 18v3" />
    </IconBase>
  );
}

export function Play(props) {
  return (
    <IconBase {...props}>
      <polygon points="8 5 19 12 8 19 8 5" fill={props.fill || "none"} />
    </IconBase>
  );
}

export function RefreshCw(props) {
  return (
    <IconBase {...props}>
      <path d="M21 2v6h-6" />
      <path d="M3 12a9 9 0 0 1 15-6.7L21 8" />
      <path d="M3 22v-6h6" />
      <path d="M21 12a9 9 0 0 1-15 6.7L3 16" />
    </IconBase>
  );
}

export function Repeat2(props) {
  return (
    <IconBase {...props}>
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11V9a3 3 0 0 1 3-3h15" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v2a3 3 0 0 1-3 3H3" />
    </IconBase>
  );
}

export function Search(props) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function Shuffle(props) {
  return (
    <IconBase {...props}>
      <path d="M16 3h5v5" />
      <path d="m4 20 6-6" />
      <path d="m20 4-8.5 8.5" />
      <path d="M4 4l6 6" />
      <path d="M16 21h5v-5" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

export function SkipBack(props) {
  return (
    <IconBase {...props}>
      <path d="M6 5v14" />
      <path d="m18 6-8 6 8 6V6Z" />
    </IconBase>
  );
}

export function SkipForward(props) {
  return (
    <IconBase {...props}>
      <path d="M18 5v14" />
      <path d="m6 6 8 6-8 6V6Z" />
    </IconBase>
  );
}

export function Sparkles(props) {
  return (
    <IconBase {...props}>
      <path d="m12 3 1.5 4.5L18 9l-4.5 1.5L12 15l-1.5-4.5L6 9l4.5-1.5L12 3Z" />
      <path d="m5 16 .8 2.2L8 19l-2.2.8L5 22l-.8-2.2L2 19l2.2-.8L5 16Z" />
      <path d="m19 14 .8 2.2L22 17l-2.2.8L19 20l-.8-2.2L16 17l2.2-.8L19 14Z" />
    </IconBase>
  );
}

export function TrendingUp(props) {
  return (
    <IconBase {...props}>
      <path d="m3 17 6-6 4 4 7-8" />
      <path d="M14 7h6v6" />
    </IconBase>
  );
}

export function Volume2(props) {
  return (
    <IconBase {...props}>
      <path d="M4 10h4l5-4v12l-5-4H4z" />
      <path d="M17 9a5 5 0 0 1 0 6" />
      <path d="M19.5 6.5a8.5 8.5 0 0 1 0 11" />
    </IconBase>
  );
}

export function Wind(props) {
  return (
    <IconBase {...props}>
      <path d="M3 8h11a2 2 0 1 0-2-2" />
      <path d="M2 12h15a2 2 0 1 1-2 2" />
      <path d="M4 16h8a2 2 0 1 0-2 2" />
    </IconBase>
  );
}

export function Zap(props) {
  return (
    <IconBase {...props}>
      <path d="M13 2 4 14h6l-1 8 9-12h-6z" fill={props.fill || "none"} />
    </IconBase>
  );
}

export function Trash2(props) {
  return (
    <IconBase {...props}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <line x1="10" x2="10" y1="11" y2="17" />
      <line x1="14" x2="14" y1="11" y2="17" />
    </IconBase>
  );
}

export function Plus(props) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </IconBase>
  );
}

export function ArrowLeft(props) {
  return (
    <IconBase {...props}>
      <path d="m11 19-7-7 7-7" />
      <path d="M19 12H5" />
    </IconBase>
  );
}
