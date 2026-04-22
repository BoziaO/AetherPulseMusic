import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  Home,
  LayoutGrid,
  Heart, 
  Clock, 
  Settings, 
  Zap, 
  Disc,
  Users, 
  Sparkles,
  X
} from "./Icons";
import { useTheme } from "../contexts/ThemeContext";

const NAV_ITEMS = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Sparkles, label: "Discover", path: "/discover" },
  { icon: Heart, label: "Favorites", path: "/favorites" },
  { icon: Clock, label: "History", path: "/recent" },
];

const LIBRARY_ITEMS = [
  { icon: LayoutGrid, label: "Playlists", path: "/playlists" },
  { icon: Disc, label: "Albums", path: "/albums" },
  { icon: Users, label: "Artists", path: "/artists" },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { liquidGlassEnabled, blurIntensity, transparency } = useTheme();

  const isSelected = (path) => location.pathname === path;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-md lg:hidden animate-in fade-in duration-300"
          onClick={onClose}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[280px] z-[300] flex flex-col transition-all duration-700 ease-out border-r border-surface-line overflow-hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } ${liquidGlassEnabled ? 'backdrop-blur' : ''}`}
        style={{
          backgroundColor: liquidGlassEnabled
            ? `rgba(var(--bg-sidebar-rgb, 11, 16, 32), ${transparency})`
            : "var(--bg-sidebar)",
          backdropFilter: liquidGlassEnabled ? `blur(${blurIntensity}px)` : undefined,
          fontFamily: "var(--font-display)"
        }}
      >
        {/* Logo Section */}
        <div className="p-10 flex items-center justify-between group">
          <Link to="/" className="flex items-center gap-4 group" onClick={onClose}>
            <div className="w-12 h-12 bg-primary rounded-2xl flex items-center justify-center shadow-2xl group-hover:rotate-[360deg] transition-transform duration-1000 shadow-primary/30">
              <Zap size={24} fill="white" className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-2xl font-black tracking-tighter leading-none" style={{ color: "var(--text-main)" }}>
                Aether<span className="text-primary">Pulse</span>
              </span>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] opacity-30">Music</span>
            </div>
          </Link>
          <button onClick={onClose} className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 hover:bg-primary transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto px-6 py-4 scrollbar-hide space-y-10">
          <nav>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 px-4 mb-6">Explore</h3>
            <ul className="space-y-2">
              {NAV_ITEMS.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-5 px-6 py-4 rounded-2xl font-bold transition-all group ${
                      isSelected(item.path)
                        ? "bg-primary text-white shadow-xl shadow-primary/20 scale-105"
                        : "hover:bg-white/5 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <item.icon 
                      size={20} 
                      className={`transition-transform duration-500 group-hover:scale-125 ${isSelected(item.path) ? "animate-pulse" : ""}`} 
                    />
                    <span className="text-sm tracking-tight">{item.label}</span>
                    {isSelected(item.path) && (
                       <span className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 px-4 mb-6">Library</h3>
            <ul className="space-y-2">
              {LIBRARY_ITEMS.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center gap-5 px-6 py-4 rounded-2xl font-bold transition-all group ${
                      isSelected(item.path)
                        ? "bg-primary text-white shadow-xl shadow-primary/20"
                        : "hover:bg-white/5 opacity-60 hover:opacity-100"
                    }`}
                  >
                    <item.icon size={20} className="group-hover:text-primary transition-colors" />
                    <span className="text-sm tracking-tight">{item.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* User / Settings Footer */}
        <div className="p-8 border-t border-surface-line space-y-4">
          <Link 
            to="/settings" 
            onClick={onClose}
            className={`flex items-center gap-5 px-6 py-4 rounded-2xl font-bold transition-all ${
              isSelected("/settings") ? "bg-white/10 text-primary" : "hover:bg-white/5 opacity-60 hover:opacity-100"
            }`}
          >
            <Settings size={20} />
            <span className="text-sm">Settings</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
