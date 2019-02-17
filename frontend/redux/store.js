/**
 * The Redux store
 */
import { createStore } from 'redux'
import reducer from './reducer.js'

export default (initialState, options) => {
  const store = createStore(reducer, initialState)

  store.subscribe(() => {
    console.log(store.getState())
  })

  return store
}
