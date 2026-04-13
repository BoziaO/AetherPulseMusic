import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import { getPageByPath, userProfile } from "../data/musicData";
import useAuthSession from "../hooks/useAuthSession";
import usePageData from "../hooks/usePageData";
import { buildApiUrl, fetchJson } from "../lib/api";
import { Bell, Search, Sparkles } from "./Icons";
import Player from "./Player";
import Sidebar from "./Sidebar";

function AppShell() {
  const location = useLocation();
  const currentPage = getPageByPath(location.pathname);
  const authSession = useAuthSession();
  const pageRequest = usePageData(currentPage.key);

  const resolvedUser = authSession.data?.auth?.user || userProfile;
  const authEnabled = authSession.data?.auth?.enabled;
  const authConnected = authSession.data?.auth?.connected;
  const loginUrl = buildApiUrl(
    `/api/auth/google?returnTo=${encodeURIComponent(location.pathname)}`,
  );

  async function handleLogout() {
    try {
      await fetchJson("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      authSession.refresh();
    }
  }

  return (
    <div className="app-shell flex bg-black min-h-screen">
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_top_left,rgba(239,68,68,0.05),transparent_40%)] pointer-events-none" />
      
      <Sidebar />

      <div className="flex-1 flex flex-col ml-[260px] min-w-0">
        <header className="topbar sticky top-0 z-[100] bg-black/80 backdrop-blur-xl border-b border-white/5 py-4 px-8 flex items-center justify-between gap-8">
          <div className="flex items-center gap-4 lg:hidden">
            <div className="w-10 h-10 bg-red-500 rounded-lg flex items-center justify-center">
              <Sparkles size={18} className="text-white" />
            </div>
            <h1 className="text-xl font-bold text-white">BoziaMusic</h1>
          </div>

          <div className="hidden md:flex flex-1 max-w-xl">
            <label className="w-full flex items-center gap-3 px-5 py-2.5 bg-neutral-900 border border-white/5 rounded-full text-neutral-400 focus-within:bg-neutral-800 focus-within:border-white/10 transition-all cursor-text">
              <Search size={18} />
              <input
                type="text"
                className="bg-transparent border-none outline-none text-white text-sm w-full placeholder:text-neutral-600"
                placeholder={currentPage.searchPlaceholder}
              />
            </label>
          </div>

          <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center text-neutral-400 hover:text-white transition-colors">
              <Bell size={20} />
            </button>
            
            <div className="h-8 w-px bg-white/10 mx-2" />

            {authConnected ? (
              <div className="flex items-center gap-3 bg-neutral-900/50 border border-white/5 pl-1.5 pr-4 py-1.5 rounded-full">
                <div className="w-8 h-8 rounded-full bg-neutral-800 overflow-hidden border border-white/10 flex items-center justify-center text-xs font-bold text-white">
                  {resolvedUser.picture ? (
                    <img src={resolvedUser.picture} alt={resolvedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    resolvedUser.initials || "U"
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-bold text-white leading-tight">{resolvedUser.name}</p>
                  <p className="text-[10px] text-neutral-500 leading-tight">Premium</p>
                </div>
                <button 
                  onClick={handleLogout}
                  className="ml-2 text-[10px] font-black uppercase tracking-widest text-neutral-500 hover:text-red-500 transition-colors"
                >
                  Wyloguj
                </button>
              </div>
            ) : (
              <a 
                href={loginUrl}
                className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                  authEnabled 
                    ? "bg-white text-black hover:scale-105 active:scale-95" 
                    : "bg-neutral-800 text-neutral-500 pointer-events-none"
                }`}
              >
                {authEnabled ? "Zaloguj się" : "Google OAuth OFF"}
              </a>
            )}
          </div>
        </header>

        <main className="flex-1 p-8">
          <div className="pb-32 max-w-[1600px] mx-auto">
            <Outlet
              context={{
                pageData: pageRequest.data,
                pageLoading: pageRequest.loading,
                pageError: pageRequest.error,
                authSession: authSession.data,
                authLoading: authSession.loading,
                authError: authSession.error,
              }}
            />
          </div>
        </main>

        <Player track={pageRequest.data?.nowPlaying || currentPage.nowPlaying} />
      </div>
    </div>
  );
}

export default AppShell;
