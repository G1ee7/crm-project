<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'
import CrmMenu from '../components/CrmMenu.vue'


</script>

<template>
  <div class="app-layout">
    <CrmMenu v-if="$route.path !== '/'" />

    <main class="page-content">
      <router-view />
    </main>
  </div>
</template>

<style scoped>
body {
  font-family: roboto, sans-serif;
}

.app-layout {
  display: flex;
} 

.page-content {
  flex: 2;
}
</style>
