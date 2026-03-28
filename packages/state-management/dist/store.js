import { createWrapper } from "next-redux-wrapper";
import { createStore, applyMiddleware } from "redux";
import thunk from "redux-thunk";
import reducer from "./reducer";
const makeStore = () => createStore(reducer, applyMiddleware(thunk));
const wrapper = createWrapper(makeStore, {
    debug: false,
});
export default wrapper;
