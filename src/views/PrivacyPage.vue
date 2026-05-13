<template>
  <div class="privacy-page">
    <PageHero
      title="Polityka Prywatności"
      subtitle="Jak chronimy Twoje dane"
      :cover="null"
    />

    <section class="section">
      <div class="prose">
        <h2>Dane zbierane</h2>
        <p>AetherPulse Music nie zbiera żadnych danych osobowych. Wszystkie informacje są przechowywane lokalnie na Twoim urządzeniu.</p>

        <h2>Cele przetwarzania</h2>
        <p>Dane są używane wyłącznie do poprawy funkcjonalności aplikacji na Twoim urządzeniu.</p>

        <h2>Trzecie strony</h2>
        <p>Aplikacja komunikuje się z YouTube Music API i SponsorBlock API. Żadne dane nie są udostępniane stronom trzecim.</p>

        <h2>Prawa użytkownika</h2>
        <p>Masz prawo do usunięcia wszystkich danych lokalnych w ustawieniach aplikacji.</p>
      </div>
    </section>
  </div>
</template>

<script setup>
import PageHero from "../components/PageHero.vue";
</script>

<style scoped>
.privacy-page {
  padding-bottom: 64px;
}

.prose {
  max-width: 800px;
  margin: 0 auto;
  padding: 0 24px;
}

.prose h2 {
  margin-top: 32px;
  margin-bottom: 16px;
  font-size: 24px;
  font-weight: 600;
}

.prose p {
  margin-bottom: 16px;
  line-height: 1.6;
}
</style>