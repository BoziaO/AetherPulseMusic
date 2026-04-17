import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import {
  BookImage,
  Compass,
  HeartHandshake,
  Heart,
  LibraryBig,
  ListMusic,
  Music,
  Mic2,
  Moon,
  Palette,
  Settings,
  Sun,
  Wind,
  Zap,
} from "./Icons";
import { navigationGroups } from "../data/musicData";
import { useTheme } from "../contexts/ThemeContext";
import ThemeSettings from "./ThemeSettings";

const iconMap = {
  home: HeartHandshake,
  discover: Compass,
  chill: Wind,
  energy: Zap,
  playlists: ListMusic,
  favorites: Heart,
  recent: Music,
  artists: Mic2,
  albums: BookImage,
};

function Sidebar({ isOpen = false, onClose }) {
  const { theme, setTheme } = useTheme();
  const [showTheme, setShowTheme] = useState(false);

  return (
    <>
      {isOpen && (
        <button
          type="button"
          aria-label="Zamknij menu"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[105] lg:hidden"
          onClick={onClose}
        />
      )}

      <aside
        className={`sidebar sidebar--no-scrollbar w-[260px] h-screen fixed left-0 top-0 overflow-y-auto flex flex-col p-6 z-[110] transition-transform duration-300 lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{
          backgroundColor: "var(--bg-sidebar)",
          borderRight: "1px solid var(--surface-line)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 mb-10 group cursor-pointer">
          <div
            className="w-11 h-11 flex items-center justify-center text-white rounded-2xl shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500"
            style={{ background: "linear-gradient(135deg, var(--primary), color-mix(in srgb, var(--primary) 70%, #ff9988))" }}
          >
            <Zap size={22} fill="white" />
          </div>
          <div>
            <h2 className="text-lg font-black tracking-tighter uppercase italic leading-tight" style={{ color: "var(--text-main)" }}>
              AetherPulse<span style={{ color: "var(--primary)" }}>|Music</span>
            </h2>
            <p className="text-[9px] uppercase tracking-[0.3em] font-black" style={{ color: "var(--text-soft)" }}>
              Adaptive player
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-8">
          {navigationGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              <p className="px-3 mb-3 text-[10px] uppercase tracking-[0.25em] font-black" style={{ color: "var(--text-soft)" }}>
                {group.title}
              </p>
              {group.items.map((item) => {
                const Icon = iconMap[item.key] || LibraryBig;
                return (
                  <NavLink
                    key={item.path}
                    end={item.path === "/"}
                    to={item.path}
                    onClick={onClose}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 group ${
                        isActive ? "font-bold" : "font-medium"
                      }`
                    }
                    style={({ isActive }) => ({
                      backgroundColor: isActive ? "var(--bg-hover-strong)" : "transparent",
                      color: isActive ? "var(--text-main)" : "var(--text-muted)",
                    })}
                  >
                    {({ isActive }) => (
                      <>
                        <Icon
                          size={19}
                          style={{ color: isActive ? "var(--primary)" : undefined }}
                          className="transition-colors duration-200 group-hover:text-[var(--primary)]"
                        />
                        <span className="text-sm tracking-tight">{item.label}</span>
                        <div
                          className="ml-auto w-1.5 h-1.5 rounded-full transition-transform duration-300"
                          style={{
                            backgroundColor: "var(--primary)",
                            transform: isActive ? "scale(1)" : "scale(0)",
                          }}
                        />
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="mt-8 pt-6 space-y-2" style={{ borderTop: "1px solid var(--surface-line)" }}>
          {/* Theme quick toggles */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => setTheme("dark")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              style={{
                backgroundColor: theme === "dark" ? "var(--primary)" : "var(--bg-hover)",
                color: theme === "dark" ? "#fff" : "var(--text-muted)",
              }}
              title="Ciemny"
            >
              <Moon size={14} />
            </button>
            <button
              onClick={() => setTheme("light")}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              style={{
                backgroundColor: theme === "light" ? "var(--primary)" : "var(--bg-hover)",
                color: theme === "light" ? "#fff" : "var(--text-muted)",
              }}
              title="Jasny"
            >
              <Sun size={14} />
            </button>
            <button
              onClick={() => setShowTheme(true)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all"
              style={{
                backgroundColor: theme === "custom" ? "var(--primary)" : "var(--bg-hover)",
                color: theme === "custom" ? "#fff" : "var(--text-muted)",
              }}
              title="Własny motyw"
            >
              <Palette size={14} />
            </button>
          </div>

          {/* Settings button */}
          <button
            onClick={() => setShowTheme(true)}
            className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl transition-all duration-200 font-medium text-sm"
            style={{ color: "var(--text-muted)", backgroundColor: "transparent" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "var(--bg-hover)";
              e.currentTarget.style.color = "var(--text-main)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
          >
            <Settings size={19} />
            <span>Ustawienia motywu</span>
          </button>
        </div>
      </aside>

      <nav
        className="fixed left-3 right-3 bottom-3 z-[190] grid grid-cols-5 gap-1 rounded-[28px] p-2 shadow-2xl lg:hidden"
        style={{
          backgroundColor: "color-mix(in srgb, var(--bg-player) 92%, transparent)",
          border: "1px solid var(--surface-line)",
          backdropFilter: "blur(22px)",
        }}
      >
        {navigationGroups.flatMap((group) => group.items).filter((item) => ["home", "discover", "playlists", "favorites", "recent"].includes(item.key)).map((item) => {
          const Icon = iconMap[item.key] || LibraryBig;
          return (
            <NavLink
              key={item.path}
              end={item.path === "/"}
              to={item.path}
              className="flex flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-black"
              style={({ isActive }) => ({
                color: isActive ? "var(--primary)" : "var(--text-muted)",
                backgroundColor: isActive ? "var(--bg-hover)" : "transparent",
              })}
            >
              <Icon size={18} />
              <span className="truncate max-w-full">{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {showTheme && <ThemeSettings onClose={() => setShowTheme(false)} />}
    </>
  );
}

export default Sidebar;
