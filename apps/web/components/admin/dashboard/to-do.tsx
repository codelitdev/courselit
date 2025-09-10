"use client";

import { SiteInfoContext } from "@components/contexts";
import { Link } from "@courselit/components-library";
import {
    SITE_SETTINGS_SECTION_GENERAL,
    SITE_SETTINGS_SECTION_PAYMENT,
} from "@ui-config/strings";
import { useContext } from "react";

export default function Todo() {
    const siteinfo = useContext(SiteInfoContext);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(!siteinfo.title || (siteinfo.logo && !siteinfo.logo.file)) && (
                <div className="flex flex-col border border-red-200 p-4 rounded-lg">
                    <h2 className="font-medium mb-1">
                        Basic details missing 💁‍♀️
                    </h2>
                    <p className="text-sm mb-4 text-muted-foreground">
                        Give your school a proper name, description and a logo.
                    </p>
                    <div>
                        <Link
                            href={`/dashboard/settings?tab=${SITE_SETTINGS_SECTION_GENERAL}`}
                        >
                            <span className="underline font-medium text-sm text-slate-700">
                                Update now
                            </span>
                        </Link>
                    </div>
                </div>
            )}
            {(!siteinfo.currencyISOCode || !siteinfo.paymentMethod) && (
                <div className="flex flex-col border border-red-200 p-4 rounded-lg">
                    <h2 className="font-semibold mb-1">Start earning 💸</h2>
                    <p className="text-sm text-muted-foreground mb-4">
                        Update your payment details to sell paid products.
                    </p>
                    <div>
                        <Link
                            href={`/dashboard/settings?tab=${SITE_SETTINGS_SECTION_PAYMENT}`}
                        >
                            <span className="underline font-medium text-sm text-slate-700">
                                Update now
                            </span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
