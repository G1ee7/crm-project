import express from 'express'
import cors from 'cors'

const app = express()
app.use(express.json())

app.use(cors())
app.use(express.json())

app.use(express.json())

app.post('/login', (req, res) => {
    const { email, password } = req.body

    const user = {
        email: 'admin@mail.com',
        password: '1234'
    }



    if (email === user.email && password === user.password) {
        res.json({
            token: '1234567890'
        })
    } else {
        res.status(401).json({
            message: 'Invalid email or password'
        })
    }
})

app.get('/me', (req, res) => {
  res.json({
    id: 1,
    email: 'admin@mail.com',
    name: 'Admin'
  })
})


let contacts = []

app.get('/contacts', (req, res) => {
  res.json(contacts)
})


app.post('/contacts', (req, res) => {
   const { name, email, phone, position, company } = req.body

  const newContact = {
    id: Date.now(),
    name,
    email,
    phone,
    position,
    company,
    avatar: '/favicon.svg'
  }

  contacts.push(newContact) 

  res.json(newContact) 
  console.log(req.body)
})


let deals = []

app.get('/deals', (req, res) => {
  res.json(deals)
})

app.post('/deals', (req, res) => {
  const { title, contact, amount, company } = req.body 

  const newDeals = {
    id: Date.now(),
    title,
    contact,
    company,
    amount,
    status: 'new'
  }

  deals.push(newDeals) 

  res.json(newDeals) 
  console.log(req.body)
})



app.listen(3000, () => {
  console.log('server started on http://localhost:3000')
})
