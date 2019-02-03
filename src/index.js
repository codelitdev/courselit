const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')
require('./config/passport.js')(passport)
require('./config/db.js')

const app = express()
app.use(passport.initialize())
app.use(bodyParser.urlencoded({ extended: true }))

app.use('/auth', require('./routes/auth.js')(passport))

app.listen(process.env.PORT || 80)
