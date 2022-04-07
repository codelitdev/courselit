import { createWrapper } from "next-redux-wrapper";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer";

const store = createStore(reducer, applyMiddleware(thunk));

const makeStore = () => {
  // store.subscribe(() => console.log(store.getState()));
  return store;
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default createWrapper(makeStore, { debug: false });
