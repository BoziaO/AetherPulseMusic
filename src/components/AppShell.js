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
    <div className="app-shell">
      <div className="app-shell__ambient app-shell__ambient--left" />
      <div className="app-shell__ambient app-shell__ambient--right" />

      <div className="app-frame">
        <Sidebar />

        <div className="main-shell">
          <header className="topbar">
            <div className="topbar__brand">
              <div className="topbar__brand-mark">
                <Sparkles size={16} />
              </div>
              <div>
                <p className="topbar__eyebrow">{currentPage.eyebrow}</p>
                <h1 className="topbar__title">BoziaMusic</h1>
              </div>
            </div>

            <label className="topbar__search" aria-label="Szukaj">
              <Search size={18} />
              <input
                type="text"
                placeholder={currentPage.searchPlaceholder}
                aria-label="Szukaj muzyki"
              />
            </label>

            <div className="topbar__profile">
              <button type="button" className="topbar__icon-button" aria-label="Powiadomienia">
                <Bell size={18} />
              </button>

              {authConnected ? (
                <div className="topbar__user">
                  <div className="topbar__avatar">
                    {resolvedUser.picture ? (
                      <img
                        src={resolvedUser.picture}
                        alt={resolvedUser.name}
                        className="topbar__avatar-image"
                      />
                    ) : (
                      resolvedUser.initials || userProfile.initials
                    )}
                  </div>
                  <div>
                    <p>{resolvedUser.name}</p>
                    <small>{resolvedUser.email || "Google connected"}</small>
                  </div>
                  <button
                    type="button"
                    className="topbar__auth-button"
                    onClick={handleLogout}
                  >
                    Wyloguj
                  </button>
                </div>
              ) : (
                <a
                  href={loginUrl}
                  className={`topbar__auth-button${
                    authEnabled ? "" : " topbar__auth-button--disabled"
                  }`}
                >
                  {authEnabled ? "Połącz Google" : "Google OAuth off"}
                </a>
              )}
            </div>
          </header>

          <main className="content-area">
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
          </main>

          <Player track={pageRequest.data?.nowPlaying || currentPage.nowPlaying} />
        </div>
      </div>
    </div>
  );
}

export default AppShell;
