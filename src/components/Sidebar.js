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
    <aside className="sidebar sidebar--no-scrollbar w-[280px] h-screen fixed left-0 top-0 overflow-y-auto bg-black border-r border-white/5 flex flex-col p-8 z-[110]">
      <div className="flex items-center gap-4 mb-12 group cursor-pointer">
        <div className="w-12 h-12 flex items-center justify-center bg-gradient-to-br from-red-500 to-red-600 text-white rounded-2xl shadow-lg shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
          <Zap size={24} fill="white" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-white tracking-tighter uppercase italic">
            Bozia<span className="text-red-500">Music</span>
          </h2>
          <p className="text-[9px] uppercase tracking-[0.3em] text-neutral-600 font-black">Powered by Energy</p>
        </div>
      </div>

      <nav className="flex-1 space-y-10">
        {navigationGroups.map((group) => (
          <div key={group.title} className="space-y-4">
            <p className="px-4 text-[10px] uppercase tracking-[0.25em] text-neutral-700 font-black">
              {group.title}
            </p>
            <div className="space-y-1.5">
              {group.items.map((item) => {
                const Icon = iconMap[item.key] || LibraryBig;

                return (
                  <NavLink
                    key={item.path}
                    end={item.path === "/"}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                        isActive
                          ? "bg-white/5 text-white shadow-xl shadow-black/50 border border-white/5"
                          : "text-neutral-500 hover:text-neutral-200 hover:bg-white/5"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="relative">
                          <Icon
                            size={20}
                            className={`transition-colors duration-300 ${isActive ? "text-red-500" : "group-hover:text-red-500"}`}
                          />
                          <div className="absolute inset-0 bg-red-500 blur-lg opacity-0 group-hover:opacity-20 transition-opacity"></div>
                        </div>
                        <span className="font-bold text-sm tracking-tight">{item.label}</span>
                        {/* Fix: use isActive from render prop instead of nonexistent .active class */}
                        <div
                          className={`ml-auto w-1.5 h-1.5 rounded-full bg-red-500 transition-transform duration-500 ${
                            isActive ? "scale-100" : "scale-0"
                          }`}
                        ></div>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mt-12 pt-8 border-t border-white/5">
        <div className="bg-gradient-to-br from-neutral-900/50 to-black p-6 rounded-[32px] border border-white/5 relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-red-500/10 blur-2xl rounded-full group-hover:scale-150 transition-transform duration-700"></div>
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-widest rounded-full border border-red-500/20">
              System
            </span>
            <span className="text-[10px] text-neutral-600 font-black uppercase tracking-widest">v1.2.0</span>
          </div>
          <p className="text-sm font-black text-white mb-1 uppercase italic tracking-tight">Status Serwera</p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
            <p className="text-[11px] text-neutral-500 font-bold uppercase tracking-widest">Połączono</p>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
