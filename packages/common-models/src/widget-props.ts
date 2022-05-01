import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import State from "./state";
import FetchBuilder from "./fetch-builder";

export default interface WidgetProps {
  name: string;
  fetchBuilder: FetchBuilder;
  section: string;
  config: Record<string, unknown>;
  utilities: unknown;
  state: State;
  dispatch: ThunkDispatch<State, null, AnyAction>;
}
