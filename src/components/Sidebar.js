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
    <aside className="sidebar">
      <div className="sidebar__brand">
        <div className="sidebar__logo">
          <Zap size={34} strokeWidth={2.6} />
        </div>
        <div>
          <p className="sidebar__eyebrow">BoziaMusic</p>
          <h2 className="sidebar__title">Twoja biblioteka energii</h2>
        </div>
      </div>

      <div className="sidebar__groups">
        {navigationGroups.map((group) => (
          <div key={group.title} className="sidebar__group">
            <p className="sidebar__group-title">{group.title}</p>
            <nav className="sidebar__nav" aria-label={group.title}>
              {group.items.map((item) => {
                const Icon = iconMap[item.key] || LibraryBig;

                return (
                  <NavLink
                    key={item.path}
                    end={item.path === "/"}
                    to={item.path}
                    className={({ isActive }) =>
                      `sidebar__link${isActive ? " sidebar__link--active" : ""}`
                    }
                  >
                    <span className="sidebar__link-icon">
                      <Icon size={18} />
                    </span>
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      <div className="sidebar__footer">
        <div className="sidebar__footer-card">
          <span className="sidebar__footer-pill">Nowe</span>
          <p>7 gotowych widoków</p>
          <small>Układ dopięty pod desktop i mobile.</small>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
