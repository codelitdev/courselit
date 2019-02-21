const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')
const graphqlHTTP = require('express-graphql')
// const { buildSchema } = require('graphql')
const cors = require('cors')
require('./config/passport.js')(passport)
require('./config/db.js')

const app = express()
app.use(cors({ origin: 'http://localhost:3000' })) // for next.js development server
app.use(passport.initialize())
app.use(/\/((?!graphql).)*/, bodyParser.urlencoded({ extended: true }))

// // Construct a schema, using GraphQL schema language
// var schema = buildSchema(`
//   type Query {
//     hello: String
//   }
// `)

// // The root provides a resolver function for each API endpoint
// var root = {
//   hello: () => {
//     // return 'Hello world!'
//     // throw new Error('aya maja')
//   }
// }
app.use('/graphql', graphqlHTTP({
  schema: require('./graphql/users/schema'),
  // rootValue: root,
  graphiql: true
}))

// routes
app.use('/auth', require('./routes/auth.js')(passport))
app.use('/user',
  passport.authenticate('jwt', { session: false }), require('./routes/account.js')())

app.listen(process.env.PORT || 80)
