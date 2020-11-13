import { createWrapper } from "next-redux-wrapper";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer.js";

const makeStore = () => {
  const store = createStore(reducer, applyMiddleware(thunk));
  // store.subscribe(() => console.log(store.getState()));
  return store;
};

export default createWrapper(makeStore, { debug: false });
