import SiteInfo from "./site-info";
import Theme from "./theme";
import { Typeface } from "./typeface";
import WidgetInstance from "./widget-instance";

interface SharedWidgets {
    [x: string]: WidgetInstance;
}

export interface Domain {
    name: string;
    customDomain: string;
    email: string;
    deleted: boolean;
    createdAt: Date;
    updatedAt: Date;
    settings: SiteInfo;
    theme: Theme;
    sharedWidgets: SharedWidgets;
    draftSharedWidgets: SharedWidgets;
    typefaces: Typeface[];
    draftTypefaces: Typeface[];
    firstRun: boolean;
    tags: string[];
    checkSubscriptionStatusAfter: Date;
    quota: {
        mail: {
            daily: number;
            monthly: number;
            dailyCount: number;
            monthlyCount: number;
            lastDailyCountUpdate: Date;
            lastMonthlyCountUpdate: Date;
        };
    };
}
