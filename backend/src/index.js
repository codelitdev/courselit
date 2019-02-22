const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')
const graphqlHTTP = require('express-graphql')
const cors = require('cors')
require('./config/passport.js')(passport)
require('./config/db.js')

const app = express()
app.use(cors({ origin: 'http://localhost:3000' })) // for next.js development server
app.use(passport.initialize())
app.use(/\/((?!graphql).)*/, bodyParser.urlencoded({ extended: true }))

app.use('/graphql', passport.authenticate('jwt', { session: false }), graphqlHTTP({
  schema: require('./graphql/justfake.js'),
  graphiql: true
}))

// routes
app.use('/auth', require('./routes/auth.js')(passport))
app.use('/user',
  passport.authenticate('jwt', { session: false }), require('./routes/account.js')())

app.listen(process.env.PORT || 80)
