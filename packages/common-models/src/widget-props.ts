import State from "./state";
import WidgetDefaultSettings from "./widget-default-settings";
import { PaymentPlan } from "./payment-plan";
import { PageType } from "./constants";

export default interface WidgetProps<T extends WidgetDefaultSettings> {
    id: string;
    name: string;
    pageData: {
        pageType: (typeof PageType)[keyof typeof PageType];
        paymentPlans?: PaymentPlan[];
        defaultPaymentPlan?: string;
        [x: string]: unknown;
    };
    state: State;
    dispatch: any;
    settings: T;
    editing: boolean;
    toggleTheme: () => void;
    nextTheme: string | undefined;
}
