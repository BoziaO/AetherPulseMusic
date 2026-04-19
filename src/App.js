import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import ErrorBoundary from "./components/ErrorBoundary";
import MusicPage from "./screens/MusicPage";
import SettingsPage from "./screens/SettingsPage";
import { ThemeProvider } from "./contexts/ThemeContext";

function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<AppShell />}>
            <Route index element={
              <ErrorBoundary>
                <MusicPage pageKey="home" />
              </ErrorBoundary>
            } />
            <Route path="discover" element={
              <ErrorBoundary>
                <MusicPage pageKey="discover" />
              </ErrorBoundary>
            } />
            <Route path="chill" element={
              <ErrorBoundary>
                <MusicPage pageKey="chill" />
              </ErrorBoundary>
            } />
            <Route path="energy" element={
              <ErrorBoundary>
                <MusicPage pageKey="energy" />
              </ErrorBoundary>
            } />
            <Route path="playlists" element={
              <ErrorBoundary>
                <MusicPage pageKey="playlists" />
              </ErrorBoundary>
            } />
            <Route path="favorites" element={
              <ErrorBoundary>
                <MusicPage pageKey="favorites" />
              </ErrorBoundary>
            } />
            <Route path="recent" element={
              <ErrorBoundary>
                <MusicPage pageKey="recent" />
              </ErrorBoundary>
            } />
            <Route path="artists" element={
              <ErrorBoundary>
                <MusicPage pageKey="artists" />
              </ErrorBoundary>
            } />
            <Route path="artist/:artistId" element={
              <ErrorBoundary>
                <MusicPage pageKey="artist" />
              </ErrorBoundary>
            } />
            <Route path="albums" element={
              <ErrorBoundary>
                <MusicPage pageKey="albums" />
              </ErrorBoundary>
            } />
            <Route path="album/:albumId" element={
              <ErrorBoundary>
                <MusicPage pageKey="album" />
              </ErrorBoundary>
            } />
            <Route path="settings" element={
              <ErrorBoundary>
                <SettingsPage />
              </ErrorBoundary>
            } />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
