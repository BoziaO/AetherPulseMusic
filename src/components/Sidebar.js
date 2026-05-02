import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Compass, Heart, BarChart3, ListMusic, Disc, Users, Settings, X } from "./Icons";
import { useLanguage } from "../contexts/LanguageContext";

const NAV_ITEMS = [
  { icon: Home, label: "home", path: "/" },
  { icon: Compass, label: "discover", path: "/discover" },
  { icon: Heart, label: "favorites", path: "/favorites" },
  { icon: BarChart3, label: "insights", path: "/insights" },
];

const LIBRARY_ITEMS = [
  { icon: ListMusic, label: "playlists", path: "/playlists" },
  { icon: Disc, label: "albums", path: "/albums" },
  { icon: Users, label: "artists", path: "/artists" },
];

export default function Sidebar({ isOpen, onClose }) {
  const location = useLocation();
  const { t } = useLanguage();

  const isSelected = (path) => location.pathname === path;

  return (
    <>
      {isOpen && (
        <div
          className="fixed inset-0 z-[250] bg-black/60 backdrop-blur-sm lg:hidden animate-fade"
          onClick={onClose}
        />
      )}

      <aside
        className={`glass-panel fixed left-0 top-0 bottom-0 w-64 z-[300] flex flex-col transition-transform duration-300 ease-out border-r ${
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          background: "linear-gradient(180deg, color-mix(in srgb, var(--bg-sidebar) 94%, var(--primary) 6%), var(--bg-sidebar))",
          borderColor: "var(--surface-line)",
        }}
      >
        {/* Logo */}
        <div className="p-6 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group" onClick={onClose}>
            <div className="brand-mark w-9 h-9 rounded-xl flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
              <svg width="20" height="20" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 4C16 4 8 12 8 18C8 22.4183 11.5817 26 16 26C20.4183 26 24 22.4183 24 18C24 12 16 4 16 4Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="16" cy="18" r="3" fill="white"/>
                <path d="M16 10V14" stroke="white" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight leading-none" style={{ color: "var(--text-main)" }}>
                Aether<span style={{ color: "var(--primary)" }}>Pulse</span>
              </span>
              <span className="text-[10px] font-medium opacity-30 mt-0.5 tracking-wide">Music</span>
            </div>
          </Link>
          <button
            onClick={onClose}
            className="lg:hidden p-2 rounded-lg transition-colors"
            style={{ color: "var(--text-muted)", backgroundColor: "var(--bg-hover)" }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-2 scrollbar-hide space-y-8">
          <nav>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider opacity-40 px-3 mb-2">
              {t("navExplore")}
            </h3>
            <ul className="space-y-0.5">
              {NAV_ITEMS.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`nav-link interactive-lift flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${isSelected(item.path) ? "nav-link-active" : ""}`}
                    style={{
                      color: isSelected(item.path) ? "var(--text-main)" : "var(--text-muted)",
                    }}
                  >
                    <item.icon size={18} strokeWidth={isSelected(item.path) ? 2.5 : 2} />
                    <span>{t(item.label) || item.label}</span>
                    <span className="nav-link-dot ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider opacity-40 px-3 mb-2">
              {t("navLibrary")}
            </h3>
            <ul className="space-y-0.5">
              {LIBRARY_ITEMS.map((item) => (
                <li key={item.path}>
                  <Link
                    to={item.path}
                    onClick={onClose}
                    className={`nav-link interactive-lift flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${isSelected(item.path) ? "nav-link-active" : ""}`}
                    style={{
                      color: isSelected(item.path) ? "var(--text-main)" : "var(--text-muted)",
                    }}
                  >
                    <item.icon size={18} strokeWidth={isSelected(item.path) ? 2.5 : 2} />
                    <span>{t(item.label) || item.label}</span>
                    <span className="nav-link-dot ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/* Footer */}
        <div className="p-4 border-t" style={{ borderColor: "var(--surface-line)" }}>
          <Link
            to="/settings"
            onClick={onClose}
            className={`nav-link interactive-lift flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-sm transition-colors ${isSelected("/settings") ? "nav-link-active" : ""}`}
            style={{
              color: isSelected("/settings") ? "var(--text-main)" : "var(--text-muted)",
            }}
          >
            <Settings size={18} />
            <span>{t("settings")}</span>
            <span className="nav-link-dot ml-auto w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
          </Link>
        </div>
      </aside>
    </>
  );
}
