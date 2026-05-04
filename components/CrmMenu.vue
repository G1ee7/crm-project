<script setup>
const menuItems = [
  { title: 'Профиль', path: '/profile' },
  { title: 'Контакты', path: '/dashboard' },
  { title: 'Компании', path: '/users' },
  { title: 'Сделки', path: '/settings' },
]
</script>

<template>
  <aside class="sidebar">
    <h2>CRM</h2>

    <ul>
      <li v-for="item in menuItems" :key="item.path">
        <router-link :to="item.path">
          {{ item.title }}
        </router-link>
      </li>
    </ul>
  </aside>
</template>

<style scoped>
.sidebar {
  width: 220px;
  min-height: 100vh;
  background: #073954;
  color: white;
  padding: 20px;
  flex-shrink: 0;
}

.sidebar ul {
  list-style: none;
  padding: 0;
  margin-top: 20px;
}

.sidebar li {
  padding: 10px;
  cursor: pointer;
  border-radius: 6px;
}

a {
  color: inherit;
  text-decoration: none;
}

.sidebar li:hover {
  background: #333;
}
</style>
