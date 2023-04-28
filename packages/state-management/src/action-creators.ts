/**
 * Action creators
 */
import {
    SIGN_IN,
    SIGN_OUT,
    NETWORK_ACTION,
    PROFILE_AVAILABLE,
    PROFILE_CLEAR,
    SITEINFO_AVAILABLE,
    AUTH_CHECKED,
    SET_MESSAGE,
    CLEAR_MESSAGE,
    THEME_AVAILABLE,
    SET_ADDRESS,
    //WIDGETS_DATA_AVAILABLE,
    FEATURE_FLAGS_AVAILABLE,
} from "./action-types";
import { FetchBuilder } from "@courselit/utils";
import getAddress from "./utils/get-address";
import type {
    State,
    SiteInfo,
    //WidgetsData,
    Theme,
} from "@courselit/common-models";
import { AppMessage } from "@courselit/common-models";
import { ThunkAction } from "redux-thunk";
import { AnyAction } from "redux";

export function signedIn() {
    return async (dispatch: any) => {
        dispatch({ type: SIGN_IN });
        dispatch(refreshUserProfile());
    };
}

export function refreshUserProfile(): ThunkAction<
    void,
    State,
    unknown,
    AnyAction
> {
    return async (dispatch: any, getState: () => State) => {
        try {
            dispatch(networkAction(true));

            const query = `
      { profile: getUser {
          name,
          id,
          email,
          userId,
          bio,
          permissions,
          purchases {
            courseId,
            completedLessons
          }
        }
      }
      `;
            const fetch = new FetchBuilder()
                .setUrl(`${getState().address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            dispatch(networkAction(false));
            dispatch(updateProfile(response.profile));
        } finally {
            dispatch(networkAction(false));
        }
    };
}

export function signedOut() {
    return (dispatch: any) => {
        dispatch(clearProfile());
        dispatch({ type: SIGN_OUT });
    };
}

export function authChecked() {
    return (dispatch: any) => {
        dispatch({ type: AUTH_CHECKED });
    };
}

export function networkAction(flag: boolean) {
    return (dispatch: any) => dispatch({ type: NETWORK_ACTION, flag });
}

export function updateProfile(profile: any) {
    return { type: PROFILE_AVAILABLE, profile };
}

export function clearProfile() {
    return { type: PROFILE_CLEAR };
}

export function updateSiteInfo(): ThunkAction<void, State, unknown, AnyAction> {
    return async (dispatch: any, getState: () => State) => {
        try {
            dispatch(networkAction(true));

            const query = `
            { site: getSiteInfo {
                    name,
                    settings {
                        title,
                        subtitle,
                        logo {
                            file
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripePublishableKey,
                        codeInjectionHead,
                        codeInjectionBody
                    },
                    theme {
                        name,
                        active,
                        styles,
                        url
                    },
                    featureFlags
                }
            }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${getState().address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();

            if (response && response.site) {
                dispatch(newSiteInfoAvailable(response.site.settings));
                dispatch(themeAvailable(response.site.theme));
                dispatch(featureFlagsAvailable(response.site.featureFlags));
            }
        } catch (err) {
            console.error(err); // eslint-disable-line no-console
        } finally {
            dispatch(networkAction(false));
        }
    };
}

export function newSiteInfoAvailable(info: SiteInfo) {
    return { type: SITEINFO_AVAILABLE, siteinfo: info };
}

export function setAppMessage(message: AppMessage) {
    return (dispatch: any) => dispatch({ type: SET_MESSAGE, message });
}

export function clearAppMessage() {
    return (dispatch: any) => dispatch({ type: CLEAR_MESSAGE });
}

export function themeAvailable(theme: Theme) {
    return { type: THEME_AVAILABLE, theme };
}

export function updateBackend(host: string): AnyAction {
    return { type: SET_ADDRESS, address: getAddress(host) };
}

export function featureFlagsAvailable(fFlags: string[]): AnyAction {
    return { type: FEATURE_FLAGS_AVAILABLE, fFlags };
}

// export function updateWidgetsData(
//     widgets: Record<string, any>,
//     widgetIDPrefix = "widget"
// ) {
//     return async (dispatch: any, getState: () => State) => {
//         try {
//             dispatch(networkAction(true));
//             const state = getState();
//             const queryString = combineGraphQLQueries(
//                 state.layout,
//                 widgets,
//                 widgetIDPrefix
//             );
//             if (queryString) {
//                 const fetchBuilder = new FetchBuilder()
//                     .setUrl(`${state.address.backend}/api/graph`)
//                     .setIsGraphQLEndpoint(true);
//                 const fetch = await fetchBuilder
//                     .setPayload(queryString)
//                     .build();
//                 const widgetsData = await fetch.exec();
//                 dispatch(widgetsDataAvailable(widgetsData));
//             }
//         } finally {
//             dispatch(networkAction(false));
//         }
//     };
// }

// function combineGraphQLQueries(
//     layout: Layout,
//     widgets: Record<string, any>,
//     widgetIDPrefix: string
// ) {
//     const widgetsUsedOnLiveSite = Object.values(layout).flat();
//     let queryString = "";
//     for (const widget of widgetsUsedOnLiveSite) {
//         const widgetGetData = widgets[widget.name].widget.getData;
//         if (widgetGetData) {
//             queryString += widgetGetData(
//                 `${widgetIDPrefix}${widget._id}`,
//                 widget.settings
//             );
//         }
//     }
//     return queryString
//         ? `
//             {
//                 ${queryString}
//             }
//         `
//         : "";
// }

/*
export function widgetsDataAvailable(widgetsData: WidgetsData): AnyAction {
    return { type: WIDGETS_DATA_AVAILABLE, widgetsData };
}
*/
