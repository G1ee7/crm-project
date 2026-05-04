<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import axios from 'axios'

const router = useRouter()

const username = ref('')
const password = ref('')
const errorMessage = ref('')

async function login() {
  errorMessage.value = ''

  try {
    const response = await axios.post('http://localhost:3000/login', {
      email: username.value,
      password: password.value
    })

    localStorage.setItem('token', response.data.token)
    router.push('/crm')
  } catch (error) {
    errorMessage.value = 'Неверный email или пароль'
    console.error('Login failed:', error)
  }
}
</script>

<template>

  <div class="login-container">
    <h2>Вход</h2>

    <form @submit.prevent="login">
      <div class="input-group">
        <label for="username">Email или логин</label>
        <input v-model="username" type="text" id="username" name="username" required>
      </div>

      <div class="input-group">
        <label for="password">Пароль</label>
        <input v-model="password" type="password" id="password" name="password" required>
      </div>

      <p v-if="errorMessage" class="error-message">{{ errorMessage }}</p>

      <button type="submit" class="login-button">Войти</button>
    </form>

    <div class="footer-links">
      <a href="#">Забыли пароль?</a>
    </div>
  </div>
</template>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

form {
  width: 100%;
  max-width: 360px;
  padding: 24px;
  border: 1px solid #ccc;
  border-radius: 8px;
  background: #fff;
}

h2 {
  margin-bottom: 16px;
}

.input-group {
  margin-bottom: 14px;
}

label {
  display: block;
  margin-bottom: 6px;
}

input {
  width: 100%;
  padding: 10px 12px;
}

.login-button {
  width: 100%;
  padding: 10px 12px;
}

.footer-links {
  margin-top: 12px;
}

.error-message {
  margin: 0 0 12px;
  color: #dc2626;
  font-size: 14px;
}
</style>
