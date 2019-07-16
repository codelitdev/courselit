/**
 * The application server for the entire API.
 */

const express = require('express')
const bodyParser = require('body-parser')
const passport = require('passport')
const graphqlHTTP = require('express-graphql')
const cors = require('cors')
const fileUpload = require('express-fileupload')
require('./middlewares/passport.js')(passport)
require('./config/db.js')
const optionalAuthMiddlewareCreator = require('./middlewares/optionalAuth.js')

const app = express()

// Middlewares
app.use(cors({ origin: 'http://localhost:3000' })) // for next.js development server
app.use(passport.initialize())
app.use(bodyParser.urlencoded({ extended: true }))
if (process.env.NODE_ENV !== 'production') {
  // only used for accessing GraphiQL with JWT auth, during development
  app.use(bodyParser.json())
}
app.use(fileUpload())

// Routes
app.use('/auth', require('./routes/auth.js')(passport))
app.use('/graph',
  optionalAuthMiddlewareCreator(passport),
  graphqlHTTP(req => ({
    schema: require('./graphql/schema.js'),
    graphiql: true,
    context: { user: req.user }
  }))
)
app.use('/media',
  // passport.authenticate('jwt', { session: false }),
  require('./routes/media.js')(passport)
)

app.listen(process.env.PORT || 80)
