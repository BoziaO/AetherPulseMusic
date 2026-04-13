import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import AppShell from "./components/AppShell";
import MusicPage from "./screens/MusicPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<MusicPage pageKey="home" />} />
          <Route path="discover" element={<MusicPage pageKey="discover" />} />
          <Route path="chill" element={<MusicPage pageKey="chill" />} />
          <Route path="energy" element={<MusicPage pageKey="energy" />} />
          <Route path="playlists" element={<MusicPage pageKey="playlists" />} />
          <Route path="artists" element={<MusicPage pageKey="artists" />} />
          <Route path="albums" element={<MusicPage pageKey="albums" />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
