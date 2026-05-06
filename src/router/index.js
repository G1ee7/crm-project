import { createRouter, createWebHistory } from 'vue-router'

import Login from '../../components/Login.vue'
import Dashboard from '../../components/Dashboard.vue'
import Profile from '../../components/Profile.vue'
import Company from '../../components/Company.vue'
import Deals from '../../components/Deals.vue'

const routes = [
  {
    path: '/',
    name: 'Login',
    component: Login
  },
  {
    path: '/crm',
    name: 'Crm',
    component: Dashboard
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: Dashboard
  },
  {
    path: '/profile',
    name: 'Profile',
    component: Profile
  },
  {
    path: '/company',
    name: 'Company',
    component: Company
  },
  {
    path: '/deals',
    name: 'Deals',
    component: Deals
  }
]

export const router = createRouter({
  history: createWebHistory(),
  routes
})
