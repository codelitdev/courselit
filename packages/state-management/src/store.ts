import { createWrapper } from "next-redux-wrapper";
import { Store } from "redux";
import { createStore, applyMiddleware } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";
import type { State } from "@courselit/common-models";
import reducer from "./reducer";
import { AnyAction } from "redux";

const store = createStore(reducer, applyMiddleware(thunk));
export type AppState = State;
export type AppDispatch = ThunkDispatch<State, null, AnyAction>;

const makeStore = () => {
  // store.subscribe(() => console.log(store.getState()));
  return store;
};

export default createWrapper<Store<State>>(makeStore, { debug: false });
