import { ThunkDispatch } from "redux-thunk";
import { AnyAction } from "redux";
import State from "./state";
import WidgetDefaultSettings from "./widget-default-settings";
import { PaymentPlan } from "./payment-plan";
import { PageType } from "./constants";

export default interface WidgetProps<T extends WidgetDefaultSettings> {
    id: string;
    name: string;
    section: string;
    pageData: {
        pageType: (typeof PageType)[keyof typeof PageType];
        paymentPlans?: PaymentPlan[];
        defaultPaymentPlan?: string;
        [x: string]: unknown;
    };
    config: Record<string, unknown>;
    state: State;
    dispatch: ThunkDispatch<State, null, AnyAction>;
    settings: T;
    editing: boolean;
}
