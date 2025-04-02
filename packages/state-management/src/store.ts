import { createWrapper } from "next-redux-wrapper";
import { Store, AnyAction } from "redux";
import { createStore, applyMiddleware } from "redux";
import thunk, { ThunkDispatch } from "redux-thunk";
import type { State } from "@courselit/common-models";
import reducer from "./reducer";

export type AppState = State;
export type AppDispatch = ThunkDispatch<State, null, AnyAction>;

const makeStore = () => createStore(reducer, applyMiddleware(thunk));

type StoreType = Store<State, AnyAction>;
type WrapperType = ReturnType<typeof createWrapper<StoreType>>;

const wrapper: WrapperType = createWrapper<StoreType>(makeStore, {
    debug: false,
});

export default wrapper;
