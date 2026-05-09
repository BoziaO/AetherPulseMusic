<template>
  <div class="animate-fade space-y-8">
    <div class="hero-skel">
      <div class="skeleton skel-cover" />
      <div class="skel-text">
        <div class="skeleton skel-eyebrow" />
        <div class="skeleton skel-title" />
        <div class="skeleton skel-subtitle" />
      </div>
    </div>
    <div class="grid">
      <div v-for="i in 10" :key="i" class="cell">
        <div class="skeleton skel-card" />
        <div class="skeleton skel-line" />
        <div class="skeleton skel-line short" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.hero-skel {
  display: grid;
  grid-template-columns: 220px minmax(0, 1fr);
  gap: 24px;
  padding: 28px;
  border-radius: var(--radius-xl);
  background: var(--bg-elevated);
}

.skel-cover {
  width: 220px;
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
}

.skel-text {
  display: flex;
  flex-direction: column;
  gap: 10px;
  justify-content: flex-end;
}

.skel-eyebrow {
  height: 10px;
  width: 80px;
  border-radius: 6px;
}
.skel-title {
  height: 36px;
  width: 60%;
  border-radius: 6px;
}
.skel-subtitle {
  height: 14px;
  width: 80%;
  border-radius: 6px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}
@media (min-width: 600px) {
  .grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}
@media (min-width: 900px) {
  .grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
@media (min-width: 1280px) {
  .grid {
    grid-template-columns: repeat(5, minmax(0, 1fr));
  }
}

.cell {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skel-card {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
}

.skel-line {
  height: 12px;
  width: 80%;
  border-radius: 4px;
}

.skel-line.short {
  width: 50%;
}

@media (max-width: 720px) {
  .hero-skel {
    grid-template-columns: 1fr;
  }
  .skel-cover {
    width: 160px;
  }
}
</style>
