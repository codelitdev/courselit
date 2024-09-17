"use client";

import { SiteInfo } from "@courselit/common-models";
import { Link } from "@courselit/components-library";
import { AppState } from "@courselit/state-management";
import {
    SITE_SETTINGS_SECTION_GENERAL,
    SITE_SETTINGS_SECTION_PAYMENT,
} from "@ui-config/strings";
import { connect } from "react-redux";

interface TodoProps {
    siteinfo: SiteInfo;
}

export const Todo = ({ siteinfo }) => {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {(!siteinfo.title || (siteinfo.logo && !siteinfo.logo.file)) && (
                <div className="flex flex-col border border-red-200 p-2 rounded-lg">
                    <h2 className="font-semibold mb-1">
                        Basic details missing 💁‍♀️
                    </h2>
                    <p className="text-sm text-slate-500 mb-4">
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
                <div className="flex flex-col border border-red-200 p-2 rounded-lg">
                    <h2 className="font-semibold mb-1">Start earning 💸</h2>
                    <p className="text-sm text-slate-500 mb-4">
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
};

const mapStateToProps = (state: AppState) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Todo);
