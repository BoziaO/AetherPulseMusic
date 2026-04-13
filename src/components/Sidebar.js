import React from "react";
import { NavLink } from "react-router-dom";
import {
  BookImage,
  Compass,
  HeartHandshake,
  LibraryBig,
  ListMusic,
  Mic2,
  Wind,
  Zap,
} from "./Icons";
import { navigationGroups } from "../data/musicData";

const iconMap = {
  home: HeartHandshake,
  discover: Compass,
  chill: Wind,
  energy: Zap,
  playlists: ListMusic,
  artists: Mic2,
  albums: BookImage,
};

function Sidebar() {
  return (
    <aside className="sidebar sidebar--no-scrollbar w-[260px] h-screen fixed left-0 top-0 overflow-y-auto bg-black border-r border-white/5 flex flex-col p-6 z-[110]">
      <div className="flex items-center gap-4 mb-10 group cursor-pointer">
        <div className="w-12 h-12 flex items-center justify-center bg-red-500 text-white rounded-xl shadow-lg shadow-red-500/20 group-hover:scale-105 transition-transform">
          <Zap size={24} fill="white" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">BoziaMusic</h2>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-bold">Twoja Energia</p>
        </div>
      </div>

      <nav className="flex-1 space-y-8">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-3">
            <p className="px-4 text-[10px] uppercase tracking-[0.2em] text-neutral-600 font-black">{group.title}</p>
            <div className="space-y-1">
              {group.items.map((item) => {
                const Icon = iconMap[item.key] || LibraryBig;

                return (
                  <NavLink
                    key={item.path}
                    end={item.path === "/"}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-200 group ${
                        isActive 
                          ? "bg-white/10 text-white" 
                          : "text-neutral-500 hover:text-neutral-200 hover:bg-white/5"
                      }`
                    }
                  >
                    <Icon size={20} className="group-hover:text-red-500 transition-colors" />
                    <span className="font-semibold text-sm">{item.label}</span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-auto pt-6 border-t border-white/5">
        <div className="bg-gradient-to-br from-neutral-900 to-black p-4 rounded-2xl border border-white/5">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-full">New</span>
            <span className="text-xs text-neutral-400 font-medium">v1.2.0</span>
          </div>
          <p className="text-sm font-bold text-white mb-1">Importuj z YT</p>
          <p className="text-[11px] text-neutral-500 leading-snug">Twoje playlisty YouTube są teraz dostępne jednym kliknięciem.</p>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
