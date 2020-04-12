import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer.js";

export default initialState => {
  const store = createStore(reducer, initialState, applyMiddleware(thunk));

  store.subscribe(() => {
    console.log(store.getState())
  });

  return store;
};
