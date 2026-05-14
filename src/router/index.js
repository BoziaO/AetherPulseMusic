import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "../components/AppLayout.vue";
import MusicPage from "../views/MusicPage.vue";
import ArtistDetailPage from "../views/ArtistDetailPage.vue";
import AlbumDetailPage from "../views/AlbumDetailPage.vue";

// Lazy-loaded views — każdy widok pobierany dopiero przy odwiedzeniu trasy.
// Daje to ~150 KB oszczędności w głównym bundle przy pierwszym renderze.
const InsightsPage = () => import("../views/InsightsPage.vue");
const SettingsPage = () => import("../views/SettingsPage.vue");
const PrivacyPage = () => import("../views/PrivacyPage.vue");
const ForYouPage = () => import("../views/ForYouPage.vue");
const DownloadsPage = () => import("../views/DownloadsPage.vue");

const pageRoute = (path, pageKey) => ({
  path,
  component: MusicPage,
  props: { pageKey },
});

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
  routes: [
    {
      path: "/",
      component: AppLayout,
      children: [
        pageRoute("", "home"),
        pageRoute("discover", "discover"),
        pageRoute("chill", "chill"),
        pageRoute("energy", "energy"),
        pageRoute("playlists", "playlists"),
        pageRoute("favorites", "favorites"),
        pageRoute("recent", "recent"),
        pageRoute("artists", "artists"),
        pageRoute("albums", "albums"),
        { path: "for-you", component: ForYouPage },
        { path: "downloads", component: DownloadsPage },
        { path: "artist/:artistId", component: ArtistDetailPage, props: true },
        { path: "album/:albumId", component: AlbumDetailPage, props: true },
        { path: "insights", component: InsightsPage },
        { path: "settings", component: SettingsPage },
        { path: "privacy", component: PrivacyPage },
        { path: ":pathMatch(.*)*", redirect: "/" },
      ],
    },
  ],
});

export default router;
