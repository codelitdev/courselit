var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
/**
 * Action creators
 */
import { SIGN_IN, SIGN_OUT, NETWORK_ACTION, PROFILE_AVAILABLE, PROFILE_CLEAR, SITEINFO_AVAILABLE, AUTH_CHECKED, THEME_AVAILABLE, SET_ADDRESS, TYPEFACES_AVAILABLE, CONFIG_AVAILABLE, } from "./action-types";
import { FetchBuilder } from "@courselit/utils";
import getAddress from "./utils/get-address";
export function signedIn() {
    return (dispatch) => __awaiter(this, void 0, void 0, function* () {
        dispatch({ type: SIGN_IN });
        dispatch(refreshUserProfile());
    });
}
export function refreshUserProfile() {
    return (dispatch, getState) => __awaiter(this, void 0, void 0, function* () {
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
            completedLessons,
            accessibleGroups
          }
           avatar {
                mediaId,
                originalFileName,
                mimeType,
                size,
                access,
                file,
                thumbnail,
                caption
            },
        }
      }
      `;
            const fetch = new FetchBuilder()
                .setUrl(`${getState().address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = yield fetch.exec();
            dispatch(networkAction(false));
            dispatch(updateProfile(response === null || response === void 0 ? void 0 : response.profile));
        }
        finally {
            dispatch(networkAction(false));
        }
    });
}
export function signedOut() {
    return (dispatch) => {
        dispatch(clearProfile());
        dispatch({ type: SIGN_OUT });
    };
}
export function authChecked() {
    return (dispatch) => {
        dispatch({ type: AUTH_CHECKED });
    };
}
export function networkAction(flag) {
    return (dispatch) => dispatch({ type: NETWORK_ACTION, flag });
}
export function updateProfile(profile) {
    return { type: PROFILE_AVAILABLE, profile };
}
export function clearProfile() {
    return { type: PROFILE_CLEAR };
}
export function updateSiteInfo() {
    return (dispatch, getState) => __awaiter(this, void 0, void 0, function* () {
        try {
            dispatch(networkAction(true));
            const query = `
            { 
                site: getSiteInfo {
                    name,
                    settings {
                        title,
                        subtitle,
                        logo {
                            file,
                            caption
                        },
                        currencyISOCode,
                        paymentMethod,
                        stripeKey,
                        codeInjectionHead,
                        codeInjectionBody,
                        mailingAddress,
                        hideCourseLitBranding,
                        razorpayKey,
                    },
                    typefaces {
                        section,
                        typeface,
                        fontWeights
                    },
                },
                theme: getTheme {
                    themeId
                    name
                    theme {
                        colors
                        typography
                        interactives
                        structure
                    }
                }
            }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${getState().address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = yield fetch.exec();
            if (response && response.site) {
                dispatch(newSiteInfoAvailable(response.site.settings));
                dispatch(typefacesAvailable(response.site.typefaces));
            }
            if (response && response.theme) {
                // dispatch(themeAvailable(response.theme));
                dispatch(themeAvailable({
                    id: response.theme.themeId,
                    name: response.theme.name,
                    theme: response.theme.theme,
                }));
            }
        }
        catch (err) {
            console.error(err); // eslint-disable-line no-console
        }
        finally {
            dispatch(networkAction(false));
        }
    });
}
export function updateConfig() {
    return (dispatch, getState) => __awaiter(this, void 0, void 0, function* () {
        try {
            dispatch(networkAction(true));
            const fetch = new FetchBuilder()
                .setUrl(`${getState().address.backend}/api/config`)
                .setHttpMethod("GET")
                .setIsGraphQLEndpoint(false)
                .build();
            const response = yield fetch.exec();
            if (response) {
                dispatch(newConfigAvailable(response));
            }
        }
        catch (err) {
            console.error(err); // eslint-disable-line no-console
        }
        finally {
            dispatch(networkAction(false));
        }
    });
}
export function newConfigAvailable(config) {
    return { type: CONFIG_AVAILABLE, config };
}
export function newSiteInfoAvailable(info) {
    return { type: SITEINFO_AVAILABLE, siteinfo: info };
}
export function themeAvailable(theme) {
    return { type: THEME_AVAILABLE, theme };
}
export function updateBackend(host) {
    return { type: SET_ADDRESS, address: getAddress(host) };
}
export function typefacesAvailable(typefaces) {
    return { type: TYPEFACES_AVAILABLE, typefaces };
}
