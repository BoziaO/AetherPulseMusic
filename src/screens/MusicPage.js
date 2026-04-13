import React from "react";
import { useOutletContext } from "react-router-dom";
import CoverArt from "../components/CoverArt";
import {
  ArrowRight,
  BadgeCheck,
  Flame,
  Play,
  Sparkles,
  TrendingUp,
} from "../components/Icons";
import { pageContent } from "../data/musicData";

function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <h2>{title}</h2>
      <button type="button" className="ghost-button">
        {action}
        <ArrowRight size={16} />
      </button>
    </div>
  );
}

function MetricCard({ stat, index }) {
  const icons = [Sparkles, TrendingUp, BadgeCheck];
  const Icon = icons[index % icons.length];

  return (
    <article className="metric-card">
      <span className="metric-card__icon">
        <Icon size={16} />
      </span>
      <strong>{stat.value}</strong>
      <p>{stat.label}</p>
    </article>
  );
}

function MediaCard({ item }) {
  return (
    <article className="media-card">
      <div className="media-card__cover">
        <CoverArt art={item.cover} />
        <button type="button" className="media-card__play" aria-label={`Odtwórz ${item.title}`}>
          <Play size={16} fill="currentColor" />
        </button>
      </div>
      <div className="media-card__body">
        <h3>{item.title}</h3>
        <p>{item.subtitle}</p>
        <span>{item.meta}</span>
      </div>
    </article>
  );
}

function ChartRow({ item }) {
  return (
    <div className="chart-row">
      <span className="chart-row__label">{item.label}</span>
      <div className="chart-row__copy">
        <strong>{item.title}</strong>
        <p>{item.subtitle}</p>
      </div>
      <span className="chart-row__change">{item.change}</span>
    </div>
  );
}

function QueueTable({ page }) {
  return (
    <section className="surface-panel">
      <SectionHeader title={page.queueTitle} action={page.queueAction} />

      <div className="queue-table">
        <div className="queue-table__head">
          <span>Pozycja</span>
          <span>Opis</span>
          <span>Długość</span>
          <span>Energia</span>
        </div>

        {page.queue.map((item, index) => (
          <div key={`${page.key}-${item.title}-${index}`} className="queue-table__row">
            <div className="queue-table__title">
              <span className="queue-table__index">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{item.title}</strong>
                <p>{item.artist}</p>
              </div>
            </div>
            <span>{item.detail}</span>
            <span>{item.duration}</span>
            <span className="queue-table__energy">{item.energy}%</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function MusicPage({ pageKey }) {
  const { pageData, pageLoading, pageError, authSession } = useOutletContext();
  const fallbackPage = pageContent[pageKey] || pageContent.home;
  const page = {
    ...fallbackPage,
    ...(pageData || {}),
    primarySection: {
      ...fallbackPage.primarySection,
      ...(pageData?.primarySection || {}),
    },
    secondarySection: {
      ...fallbackPage.secondarySection,
      ...(pageData?.secondarySection || {}),
    },
  };

  const googleConnected = authSession?.auth?.connected;
  const ytMusicHeaders = page.backendStatus?.imports?.ytMusicHeaders;

  return (
    <div className="page">
      <section className="page-hero">
        <div className="page-hero__copy">
          <p className="page-hero__eyebrow">{page.eyebrow}</p>
          <h1>{page.title}</h1>
          <p className="page-hero__description">{page.description}</p>

          <div className="page-hero__chips">
            {page.chips.map((chip) => (
              <span key={chip} className="page-chip">
                {chip}
              </span>
            ))}
          </div>
        </div>

        <aside className="surface-panel hero-aside">
          <div className="hero-aside__header">
            <span className="hero-aside__badge">
              <Flame size={14} />
              Live data
            </span>
            <p>{pageLoading ? "Ładowanie danych" : "Backend aktywny"}</p>
          </div>
          <h2>{page.spotlightTitle}</h2>
          <p>{page.spotlightText}</p>
          <ul className="hero-aside__list">
            {page.spotlightItems.map((item) => (
              <li key={item}>{item}</li>
            ))}
            <li>{googleConnected ? "Google OAuth połączony" : "Google OAuth niepołączony"}</li>
            <li>
              {ytMusicHeaders
                ? "headers.json dla YT Music wykryty"
                : "YT Music library bez headers.json"}
            </li>
            {pageError ? <li>Błąd backendu: {pageError}</li> : null}
          </ul>
        </aside>
      </section>

      <section className="metric-grid">
        {page.stats.map((stat, index) => (
          <MetricCard key={`${page.key}-${stat.label}`} stat={stat} index={index} />
        ))}
      </section>

      <section className="page-split">
        <div className="surface-panel">
          <SectionHeader title={page.primarySection.title} action={page.primarySection.action} />
          <div className="media-grid">
            {page.primarySection.items.map((item) => (
              <MediaCard key={`${page.key}-${item.title}`} item={item} />
            ))}
          </div>
        </div>

        <aside className="surface-panel chart-panel">
          <SectionHeader title={page.chartTitle} action="Pełny ranking" />
          <div className="chart-panel__list">
            {page.chartItems.map((item) => (
              <ChartRow key={`${page.key}-${item.label}`} item={item} />
            ))}
          </div>
        </aside>
      </section>

      <section className="surface-panel">
        <SectionHeader title={page.secondarySection.title} action={page.secondarySection.action} />
        <div className="media-grid media-grid--wide">
          {page.secondarySection.items.map((item) => (
            <MediaCard key={`${page.key}-${item.title}-secondary`} item={item} />
          ))}
        </div>
      </section>

      <QueueTable page={page} />
    </div>
  );
}

export default MusicPage;
