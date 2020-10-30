import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer.js";

const Store = (initialState) => {
  const store = createStore(reducer, initialState, applyMiddleware(thunk));

  store.subscribe(() => {
    // console.log(store.getState());
  });

  return store;
};

export default Store;
