/**
 * The Redux store
 */
import { createStore, applyMiddleware } from 'redux'
import thunk from 'redux-thunk'
import reducer from './reducer.js'

export default () => {
  const store = createStore(reducer, applyMiddleware(thunk))

  // store.subscribe(() => {
  //   console.log(store.getState())
  // })

  return store
}
