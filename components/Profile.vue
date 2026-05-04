<script setup>
import { computed, ref, onMounted } from 'vue'
import axios from 'axios'

const user = ref(null)
const errorMessage = ref('')
const isLoading = ref(true)
const profilePhoto = computed(() => user.value?.avatarUrl || '/favicon.svg')

async function fetchProfile() {
  try {
    const res = await axios.get('http://localhost:3000/me')
    user.value = res.data
  } catch (error) {
    errorMessage.value = 'Не удалось загрузить профиль'
    console.error('Profile load failed:', error)
  } finally {
    isLoading.value = false
  }
}

onMounted(fetchProfile)
</script>

<template>
  <div class="profile-container">
    <p v-if="isLoading">Загрузка профиля...</p>

    <p v-else-if="errorMessage">{{ errorMessage }}</p>

    <div v-else-if="user" class="profile-info">
      <img :src="profilePhoto" alt="Фото профиля">
      <div class="profile-text">
        <h2>{{ user.name }}</h2>
        <p>email: {{ user.email }}</p>
      </div>
    </div>

    <div class="profile-count">
      <div class="profile-count-item card-yellow">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="6" cy="12" r="2.5" />
            <circle cx="18" cy="6" r="2.5" />
            <circle cx="18" cy="18" r="2.5" />
            <path d="M8.2 11 15.8 7.2M8.2 13 15.8 16.8" />
          </svg>
          <h3>Контрагенты</h3>
          <button class="card-arrow" type="button">→</button>
        </div>

        <div class="card-stats">
          <span class="badge red">2</span>
          <p>требуют внимания</p>
          <span class="badge">15</span>
          <p>всего</p>
        </div>
      </div>

      <div class="profile-count-item card-yellow">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M7 3h8l4 4v14H7z" />
            <path d="M15 3v5h5M10 12h6M10 16h6" />
          </svg>
          <h3>Контракты</h3>
          <button class="card-arrow" type="button">→</button>
        </div>

        <div class="card-stats">
          <span class="badge red">2</span>
          <p>требуют внимания</p>
          <span class="badge">15</span>
          <p>всего</p>
          <span class="badge">5</span>
          <p>в этом месяце</p>
        </div>
      </div>

      <div class="profile-count-item card-green">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 3h12v18H6z" />
            <path d="M9 8l2 2 4-4M9 16l2-2 4 4" />
          </svg>
          <h3>Сделки</h3>
          <button class="card-arrow" type="button">→</button>
        </div>

        <div class="card-stats">
          <span class="badge red">2</span>
          <p>требуют внимания</p>
          <span class="badge">15</span>
          <p>всего</p>
          <span class="badge">5</span>
          <p>в этом месяце</p>
        </div>
      </div>

      <div class="profile-count-item card-gray">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M5 21V5h10v16M15 9h4v12M8 9h2M8 13h2M8 17h2" />
          </svg>
          <h3>Группы компаний</h3>
          <button class="card-arrow" type="button">→</button>
        </div>

        <div class="card-stats">
          <span class="badge">15</span>
          <p>всего</p>
        </div>
      </div>

      <div class="profile-count-item card-gray">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="8" cy="8" r="3" />
            <circle cx="17" cy="9" r="2.5" />
            <path d="M3 20c.7-4 3-6 5-6s4.3 2 5 6M13.5 15c2.5.2 4.4 1.8 5 5" />
          </svg>
          <h3>Пользователи</h3>
          <button class="card-arrow" type="button">→</button>
        </div>

        <div class="card-stats">
          <span class="badge">15</span>
          <p>всего</p>
        </div>
      </div>

      <div class="profile-count-item card-gray">
        <div class="card-header">
          <svg class="card-icon" viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="12" cy="12" r="3" />
            <path d="M19 12a7 7 0 0 0-.1-1l2-1.5-2-3.5-2.4 1a8 8 0 0 0-1.8-1L14.5 3h-5l-.3 3a8 8 0 0 0-1.8 1L5 6 3 9.5 5 11a7 7 0 0 0 0 2l-2 1.5L5 18l2.4-1a8 8 0 0 0 1.8 1l.3 3h5l.3-3a8 8 0 0 0 1.8-1l2.4 1 2-3.5-2-1.5a7 7 0 0 0 .1-1z" />
          </svg>
          <h3>Настройки</h3>
          <button class="card-arrow" type="button">→</button>
        </div>

        <div class="settings-tags">
          <span>Настройки</span>
          <span>Доп. поля</span>
          <span>Права и роли</span>
          <span>Статусы сделок</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-container {
  padding: 50px;
}

.profile-info {
  display: flex;
  height: 140px;
  align-items: center;
  gap: 16px;
  border-radius: 25px;
  background-color: #DEF3FE;
}

.profile-info img {
  width: 100px;
  height: 100px;
  margin-left: 50px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.profile-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.profile-text h2,
.profile-text p {
  margin: 0;
}

.profile-count {
  display: grid;
  grid-template-columns: repeat(3, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.profile-count-item {
  min-height: 120px;
  padding: 18px;
  border-radius: 14px;
  color: #111;
  font-weight: bold;
}

.card-yellow {
  background-color: #FFFACE;
}

.card-green {
  background-color: #DDF5D4;
}

.card-gray {
  background-color: #F5F5F5;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 13px;
  text-transform: uppercase;
}

.card-icon {
  width: 30px;
  height: 30px;
  fill: none;
  stroke: #111;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  flex-shrink: 0;
}

.card-arrow {
  width: 34px;
  height: 34px;
  margin-left: auto;
  border: 2px solid #48b72f;
  border-radius: 50%;
  background: transparent;
  color: #48b72f;
  font-size: 20px;
  cursor: pointer;
}

.card-stats {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 6px;
  margin-top: 18px;
}

.card-stats p {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 18px;
  height: 18px;
  padding: 0 5px;
  border-radius: 999px;
  background-color: #fff;
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  font-size: 11px;
}

.badge.red {
  background-color: #e60012;
  color: #fff;
}

.settings-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 18px;
}

.settings-tags span {
  padding: 4px 9px;
  border: 1px solid #111;
  border-radius: 5px;
  font-size: 11px;
  font-weight: 600;
}
</style>
