const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')
const cors = require('cors')
require('./config/passport.js')(passport)
require('./config/db.js')

const app = express()
app.use(cors({ origin: 'http://localhost:3000' })) // next.js development server
app.use(passport.initialize())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/auth', require('./routes/auth.js')(passport))

app.listen(process.env.PORT || 80)
