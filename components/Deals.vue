<script setup>
import { ref, onMounted, computed } from 'vue'
import axios from 'axios'


const newName = ref('')
const newPhone = ref('')
const newAmount = ref('')

const search = ref('')


const stages = [
  { title: 'Неразобранное', status: 'new' },
  { title: 'В работе', status: 'work' },
  { title: 'Оплачен', status: 'paid' },
  { title: 'Успешно', status: 'success' },
  { title: 'Отказ', status: 'lost' }
]

const deals = ref([
  {
    id: 1,
    title: "Website project",
    contact: "+77712558033",
    company: "Kaspi",
    amount: 120000,
    status: "new"
  }
])


function moveDeal(deal){
  const index = stages.findIndex(s => s.status === deal.status)

  const nextIndex = (index + 1) % stages.length

  deal.status = stages[nextIndex].status
}


async function createDeal() {
    const response = await axios.post('http://localhost:3000/deals', {
    title: newName.value,
    contact: newPhone.value,
    amount: newAmount.value
  })

  deals.value.push(response.data)
  console.log(response.data)

}


const dealsSearch = computed(() => {
  const query = search.value.toLowerCase().trim()

  return deals.value.filter(d => {
    return (
      (d.title || '').toLowerCase().includes(query) ||
      (d.contact || '').toLowerCase().includes(query) ||
      (d.company || '').toLowerCase().includes(query) ||
      String(d.amount || '').includes(query)
    )
  })
})


</script>

<template>
  <div class="container">
    <h2>Сделки</h2>

    <button popovertarget="my-popover">Добавить сделку</button>
  </div>

    <div id="my-popover" popover class="modal">
        <input v-model="newName" type="text" placeholder="Название сделки..." />
        <input v-model="newPhone" type="text" placeholder="Номер телефона..." />
        <input v-model="newAmount" type="text" placeholder="Сумма..." />
        <button @click="createDeal" type="button">Добавить</button>
    </div>


    <div class="search-row">
      <input v-model="search" type="text" placeholder="Поиск..." />
     </div>


      <div class="board">
      <div v-for="stage in stages" :key="stage.status" class="column">
          <h3>{{ stage.title }}</h3>

          <div v-for="deal in dealsSearch.filter(d => d.status === stage.status)" class="new-deals">
          <div> Название: {{ deal.title }}</div>    
          <div> Контакт: {{ deal.contact }}</div>
          <div> Компания: {{ deal.company }}</div>
          <div> Сумма: {{ deal.amount }}</div>
          <div>
            <button @click="moveDeal(deal)">➡</button>
          </div>
          </div>      
          
      </div>
      </div>

</template>

<style scoped>

body {
  font-family: Inter, sans-serif;
  background: #f5f7fb;
  margin: 0;
}


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

.deals {
  padding: 40px;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-left: 30px;
  width: 550px;
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

.deals input {
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

.board {
  display: flex;
  padding: 30px;
  gap: 20px;
  margin-top: 30px;
  align-items: flex-start;
}

.column {
  flex: 1;
  padding: 20px;
  border: 1px solid #cfcfcf;
  border-radius: 8px;
  height: 80vh;
  overflow-y: auto;
  flex-direction: column;
  gap: 10px;
  background: #ffffff;
  border-radius: 14px;
  padding: 12px;

  box-shadow: 0 4px 12px rgba(0,0,0,0.06);

}

.new-deals:not(:last-child) {
  margin-bottom: 10px;
}

.new-deals:hover {
  transform: translateY(-2px);
}


.new-deals {

  background: white;
  border-radius: 10px;
  padding: 12px;
  margin-bottom: 10px;
  box-shadow: 0 5px 10px 10px rgba(0,0,0,0.05);
  transition: 0.2s;
}

.new-deals div {
  font-size: 13px;
  color: #374151;
  margin-bottom: 4px;
}

.column h3 {
  font-size: 13px;
  font-weight: 600;
  color: #5c5e61;
  margin-bottom: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

button {
  border: none;
  background: #4DB02A;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  cursor: pointer;
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
