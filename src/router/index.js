import { createRouter, createWebHistory } from "vue-router";
import AppLayout from "../components/AppLayout.vue";
import MusicPage from "../views/MusicPage.vue";
import ArtistDetailPage from "../views/ArtistDetailPage.vue";
import AlbumDetailPage from "../views/AlbumDetailPage.vue";
import InsightsPage from "../views/InsightsPage.vue";
import SettingsPage from "../views/SettingsPage.vue";

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
        { path: "artist/:artistId", component: ArtistDetailPage, props: true },
        { path: "album/:albumId", component: AlbumDetailPage, props: true },
        { path: "insights", component: InsightsPage },
        { path: "settings", component: SettingsPage },
        { path: ":pathMatch(.*)*", redirect: "/" },
      ],
    },
  ],
});

export default router;
