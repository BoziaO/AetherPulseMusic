<template>
  <div class="animate-in space-y-8">
    <div class="panel p-6">
      <div class="skeleton mb-4 h-4 w-32" />
      <div class="skeleton mb-3 h-10 w-2/3" />
      <div class="skeleton h-4 w-1/2" />
    </div>
    <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div v-for="item in 8" :key="item" class="panel p-3">
        <div class="skeleton mb-3 aspect-square" />
        <div class="skeleton mb-2 h-4 w-4/5" />
        <div class="skeleton h-3 w-1/2" />
      </div>
    </div>
  </div>
</template>
