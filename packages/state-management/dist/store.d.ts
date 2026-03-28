import { createWrapper } from "next-redux-wrapper";
import { Store, AnyAction } from "redux";
import { ThunkDispatch } from "redux-thunk";
import type { State } from "@courselit/common-models";
export type AppState = State;
export type AppDispatch = ThunkDispatch<State, null, AnyAction>;
type StoreType = Store<State, AnyAction>;
type WrapperType = ReturnType<typeof createWrapper<StoreType>>;
declare const wrapper: WrapperType;
export default wrapper;
//# sourceMappingURL=store.d.ts.map