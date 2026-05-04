<script setup>
import { ref, onMounted } from 'vue'
import axios from 'axios'

const newContact = ref('')
const newEmail = ref('')
const newPhone = ref('')
const newPosition = ref('')
const newCompany = ref('')



const contacts = ref([
  {
    id: 1,
    name: 'Иван Иванов',
    email: 'ivan@mail.com',
    phone: '+7 777 123 45 67',
    position: 'Менеджер',
    company: 'Kaspi',
    avatar: '/favicon.svg'
  },
  {
    id: 2,
    name: 'Алексей Смирнов',
    email: 'alex@mail.com',
    phone: '+7 701 555 22 11',
    position: 'Разработчик',
    company: 'Yandex',
    avatar: '/favicon.svg'
  },
  {
    id: 3,
    name: 'Мария Ким',
    email: 'maria@mail.com',
    phone: '+7 705 888 99 00',
    position: 'Дизайнер',
    company: 'AirAstana',
    avatar: '/favicon.svg'
  },
  {
    id: 4,
    name: 'Данияр Нуров',
    email: 'daniyar@mail.com',
    phone: '+7 747 333 44 55',
    position: 'Аналитик',
    company: 'Kolesa',
    avatar: '/favicon.svg'
  },
  {
    id: 5,
    name: 'Алина Сейтова',
    email: 'alina@mail.com',
    phone: '+7 700 111 22 33',
    position: 'HR',
    company: 'Freedom',
    avatar: '/favicon.svg'
  }
])


async function loadContacts() {
  try {
    const response = await axios.get('http://localhost:3000/contacts')
    contacts.value = response.data
    console.log('GET RESPONSE:', response.data)
  } catch (error) {
    console.error('Error loading contacts:', error)
  }
}

async function createContact() {
  const response = await axios.post('http://localhost:3000/contacts', {
    name: newContact.value,
    email: newEmail.value,
    phone: newPhone.value,
    position: newPosition.value,
    company: newCompany.value,
  })

  contacts.value.push(response.data)
  newContact.value = ''
  newEmail.value = ''
  newPhone.value = ''
  newPosition.value = ''
  newCompany.value = ''
}


</script>

<template>
  <div class="container">
    <h2>Контактные лица и сотрудники</h2>

    <button popovertarget="my-popover">Добавить контакт</button>
  </div>

    <div id="my-popover" popover class="modal">
        <input v-model="newContact" type="text" placeholder="Имя контакта..." />
        <input v-model="newPhone" type="text" placeholder="Номер телефона..." />
        <input v-model="newEmail" type="text" placeholder="Почта..." />
        <input v-model="newPosition" type="text" placeholder="Должность..." />
        <input v-model="newCompany" type="text" placeholder="Компания..." />
        <button @click="createContact" type="button">Добавить</button>
    </div>

  <div class="contacts">
    <div class="search-row">
      <input type="text" placeholder="Поиск по контактам..." />
      <button class="search-button">Поиск</button>
    </div>

    <div class="contacts-table">
      <div class="contacts-header">
        <div></div>
        <div>ФИО</div>
        <div>Номер телефона</div>
        <div>E-mail</div>
        <div>Должность</div>
        <div>Компания</div>

      </div>

      <div v-for="contact in contacts" :key="contact.id" class="contact-row">
        <div>
          <img :src="contact.avatar" alt="avatar">
        </div>
        <div>{{ contact.name }}</div>
        <div>{{ contact.phone }}</div>
        <div>{{ contact.email }}</div>
        <div>{{ contact.position }}</div>
        <div>{{ contact.company }}</div>

        <div class="row-actions">
          <button type="button">✎</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.container {
  display: flex;
  justify-content: space-between;
  padding: 30px;
}

.container button {
  margin-left: auto;
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #4DB02A;
  color: white;
  cursor: pointer;
}

.contacts {
  padding: 40px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.search-row input {
  flex: 1;
  min-width: 0;
  padding: 14px 18px;
  border: 1px solid black;
  border-radius: 12px;
  background-color: #f8fbfd;
  color: #073954;
  font-size: 15px;
  outline: none;
}

.contacts input {
  max-width: 900px;
  padding: 14px 18px;
  border: 1px solid black;
  border-radius: 12px;
  background-color: #f8fbfd;
  color: #073954;
  font-size: 15px;
  outline: none;
}

.contacts input:focus {
  border-color: #4DB02A;
  background-color: #fff;
}

.search-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  background-color: #4DB02A;
  color: white;
  cursor: pointer;
}

.contacts-table {
  margin-top: 28px;
}

.contacts-header,
.contact-row {
  display: grid;
  grid-template-columns: 48px 1.3fr 1.3fr 1.3fr 1.3fr 1.3fr 120px;
  align-items: center;
  gap: 16px;
}

.contacts-header {
  padding: 0 12px 16px;
  border-bottom: 1px solid #cfcfcf;
  font-weight: 700;
  font-size: 14px;
}

.contact-row {
  min-height: 54px;
  padding: 8px 12px;
  font-size: 14px;
}

.contact-row:nth-child(odd) {
  background-color: #f5f5f5;
}

.contact-row img {
  width: 34px;
  height: 34px;
  border: 2px solid #00A9E0;
  border-radius: 50%;
  object-fit: cover;
}

.table-actions,
.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.table-actions button,
.row-actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: 1px solid #4DB02A;
  border-radius: 50%;
  background-color: white;
  color: #4DB02A;
  cursor: pointer;
  font-size: 15px;
}

.table-actions button {
  border-radius: 5px;
}

.modal {
  inset: 0;
  margin: auto;
  padding: 20px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  background-color: white;
}

.modal:popover-open {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.modal input {
  width: 360px;
  padding: 14px 18px;
  border: 1px solid black;
  border-radius: 12px;
  background-color: #f8fbfd;
  color: #073954;
  font-size: 15px;
  outline: none;
}

.modal input:focus {
  border-color: #4DB02A;
  background-color: #fff;
}

.modal button {
  padding: 8px 16px;
  border: none;
  border-radius: 5px;
  background-color: #4DB02A;
  color: white;
  cursor: pointer;
}

.modal::backdrop {
  background-color: rgba(0, 0, 0, 0.25);
}
</style>
