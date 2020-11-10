import { createWrapper } from "next-redux-wrapper";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer.js";

const makeStore = () => createStore(reducer, applyMiddleware(thunk));

export default createWrapper(makeStore, {debug: false});