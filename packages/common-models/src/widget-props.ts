import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import State from "./state";
import WidgetDefaultSettings from "./widget-default-settings";

export default interface WidgetProps<T extends WidgetDefaultSettings> {
    id: string;
    name: string;
    section: string;
    config: Record<string, unknown>;
    utilities: unknown;
    state: State;
    dispatch: ThunkDispatch<State, null, AnyAction>;
    settings: T;
}
