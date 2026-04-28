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

export function ChevronDown(props) {
  return (
    <IconBase {...props}>
      <path d="m6 9 6 6 6-6" />
    </IconBase>
  );
}

export function ChevronUp(props) {
  return (
    <IconBase {...props}>
      <path d="m18 15-6-6-6 6" />
    </IconBase>
  );
}

export function ArrowUp(props) {
  return (
    <IconBase {...props}>
      <path d="m18 15-6-6-6 6" />
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

export function Menu(props) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
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

export function Pause(props) {
  return (
    <IconBase {...props}>
      <rect x="6" y="4" width="4" height="16" rx="1" fill={props.fill || "none"} />
      <rect x="14" y="4" width="4" height="16" rx="1" fill={props.fill || "none"} />
    </IconBase>
  );
}

export function VolumeX(props) {
  return (
    <IconBase {...props}>
      <path d="M11 5 6 9H2v6h4l5 4V5Z" />
      <line x1="23" x2="17" y1="9" y2="15" />
      <line x1="17" x2="23" y1="9" y2="15" />
    </IconBase>
  );
}

export function Heart(props) {
  return (
    <IconBase {...props}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" fill={props.fill || "none"} />
    </IconBase>
  );
}

export function Music(props) {
  return (
    <IconBase {...props}>
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </IconBase>
  );
}

export function X(props) {
  return (
    <IconBase {...props}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </IconBase>
  );
}

export function Download(props) {
  return (
    <IconBase {...props}>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </IconBase>
  );
}

export function Edit2(props) {
  return (
    <IconBase {...props}>
      <path d="M17 3a2.85 2.85 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
    </IconBase>
  );
}

export function Moon(props) {
  return (
    <IconBase {...props}>
      <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
    </IconBase>
  );
}

export function Sun(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </IconBase>
  );
}

export function Palette(props) {
  return (
    <IconBase {...props}>
      <circle cx="13.5" cy="6.5" r=".5" fill="currentColor" />
      <circle cx="17.5" cy="10.5" r=".5" fill="currentColor" />
      <circle cx="8.5" cy="7.5" r=".5" fill="currentColor" />
      <circle cx="6.5" cy="12.5" r=".5" fill="currentColor" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" />
    </IconBase>
  );
}

export function Settings(props) {
  return (
    <IconBase {...props}>
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function Eye(props) {
  return (
    <IconBase {...props}>
      <path d="M2.99902 12.0001C2.99902 12.0001 6.99902 5.00012 12 5.00012C17.0009 5.00012 21.0009 12.0001 21.0009 12.0001C21.0009 12.0001 17.0009 19.0001 12 19.0001C6.99902 19.0001 2.99902 12.0001 2.99902 12.0001Z" />
      <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
    </IconBase>
  );
}

export function Clock(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </IconBase>
  );
}

export function Layers(props) {
  return (
    <IconBase {...props}>
      <polygon points="12 2 2 7 2 7 12 12 22 7 22 7 12 2" />
      <polygon points="2 17 12 22 22 17" />
      <polygon points="2 12 12 17 22 12" />
    </IconBase>
  );
}

export function Sliders(props) {
  return (
    <IconBase {...props}>
      <line x1="4" x2="4" y1="9" y2="20" />
      <line x1="4" x2="4" y1="5" y2="5" />
      <circle cx="4" cy="7" r="2" />
      <line x1="12" x2="12" y1="9" y2="20" />
      <line x1="12" x2="12" y1="5" y2="5" />
      <circle cx="12" cy="7" r="2" />
      <line x1="20" x2="20" y1="9" y2="20" />
      <line x1="20" x2="20" y1="5" y2="5" />
      <circle cx="20" cy="7" r="2" />
    </IconBase>
  );
}

export function Mic(props) {
  return (
    <IconBase {...props}>
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3Z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" x2="12" y1="19" y2="23" />
      <line x1="8" x2="16" y1="23" y2="23" />
    </IconBase>
  );
}

export function Home(props) {
  return (
    <IconBase {...props}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </IconBase>
  );
}

export function Disc(props) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="3" />
    </IconBase>
  );
}

export function Users(props) {
  return (
    <IconBase {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </IconBase>
  );
}

export function Maximize2(props) {
  return (
    <IconBase {...props}>
      <polyline points="15 3 21 3 21 9" />
      <polyline points="9 21 3 21 3 15" />
      <line x1="21" x2="14" y1="3" y2="10" />
      <line x1="3" x2="10" y1="21" y2="14" />
    </IconBase>
  );
}

export function List(props) {
  return (
    <IconBase {...props}>
      <line x1="8" x2="21" y1="6" y2="6" />
      <line x1="8" x2="21" y1="12" y2="12" />
      <line x1="8" x2="21" y1="18" y2="18" />
      <line x1="3" x2="3.01" y1="6" y2="6" />
      <line x1="3" x2="3.01" y1="12" y2="12" />
      <line x1="3" x2="3.01" y1="18" y2="18" />
    </IconBase>
  );
}

export function Droplets(props) {
  return (
    <IconBase {...props}>
      <path d="m7 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3s-4 3-4 6.3c0 2.2 1.8 4 4 4z" />
      <path d="m17 16.3c2.2 0 4-1.8 4-4 0-3.3-4-6.3-4-6.3s-4 3-4 6.3c0 2.2 1.8 4 4 4z" />
    </IconBase>
  );
}

export function Monitor(props) {
  return (
    <IconBase {...props}>
      <rect width="20" height="14" x="2" y="3" rx="2" />
      <line x1="8" x2="16" y1="21" y2="21" />
      <line x1="12" x2="12" y1="17" y2="21" />
    </IconBase>
  );
}

export function ShieldCheck(props) {
  return (
    <IconBase {...props}>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </IconBase>
  );
}

export function Languages(props) {
  return (
    <IconBase {...props}>
      <path d="m5 8 6 6" />
      <path d="m4 14 6-6 2-3" />
      <path d="M2 5h12" />
      <path d="M7 2h1" />
      <path d="m22 22-5-10-5 10" />
      <path d="M14 18h6" />
    </IconBase>
  );
}

export function BarChart3(props) {
  return (
    <IconBase {...props}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </IconBase>
  );
}
