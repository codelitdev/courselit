import { decode } from "base-64";
import { combineReducers } from "redux";
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
    TYPEFACES_AVAILABLE,
    CONFIG_AVAILABLE,
} from "./action-types";
import { HYDRATE } from "next-redux-wrapper";
import initialState from "./default-state";
import Action from "./action";

function authReducer(state = initialState.auth, action: Action) {
    switch (action.type) {
        case SIGN_IN:
            return {
                guest: false,
                checked: true,
            };
        case SIGN_OUT:
            return initialState.auth;
        case AUTH_CHECKED:
            return Object.assign({}, state, { checked: true });
        default:
            return state;
    }
}

function siteinfoReducer(state = initialState.siteinfo, action: Action) {
    switch (action.type) {
        case SITEINFO_AVAILABLE:
            try {
                return {
                    title: action.siteinfo.title || initialState.siteinfo.title,
                    subtitle:
                        action.siteinfo.subtitle ||
                        initialState.siteinfo.subtitle,
                    logo: action.siteinfo.logo || initialState.siteinfo.logo,
                    currencyISOCode:
                        action.siteinfo.currencyISOCode ||
                        initialState.siteinfo.currencyISOCode,
                    paymentMethod:
                        action.siteinfo.paymentMethod ||
                        initialState.siteinfo.paymentMethod,
                    stripeKey:
                        action.siteinfo.stripeKey ||
                        initialState.siteinfo.stripeKey,
                    codeInjectionHead:
                        decode(action.siteinfo.codeInjectionHead) ||
                        initialState.siteinfo.codeInjectionHead,
                    codeInjectionBody:
                        decode(action.siteinfo.codeInjectionBody) ||
                        initialState.siteinfo.codeInjectionBody,
                    mailingAddress:
                        action.siteinfo.mailingAddress ||
                        initialState.siteinfo.mailingAddress,
                    hideCourseLitBranding:
                        action.siteinfo.hideCourseLitBranding ||
                        initialState.siteinfo.hideCourseLitBranding,
                    razorpayKey:
                        action.siteinfo.razorpayKey ||
                        initialState.siteinfo.razorpayKey,
                };
            } catch (e) {
                return state;
            }
        default:
            return state;
    }
}

function networkActionReducer(
    state = initialState.networkAction,
    action: Action,
) {
    switch (action.type) {
        case NETWORK_ACTION:
            return action.flag;
        default:
            return state;
    }
}

function profileReducer(state = initialState.profile, action: Action) {
    switch (action.type) {
        case PROFILE_AVAILABLE:
            return {
                id: action.profile && action.profile.id,
                name: action.profile && action.profile.name,
                fetched: true,
                purchases: (action.profile && action.profile.purchases) || [],
                email: action.profile && action.profile.email,
                userId: action.profile && action.profile.userId,
                bio: action.profile && action.profile.bio,
                permissions:
                    (action.profile && action.profile.permissions) || [],
                avatar: action.profile && action.profile.avatar,
            };
        case PROFILE_CLEAR:
            return initialState.profile;
        default:
            return state;
    }
}

function messageReducer(state = initialState.message, action: Action) {
    switch (action.type) {
        case SET_MESSAGE:
            return {
                message: action.message.message,
                action: action.message.action,
                open: true,
            };
        case CLEAR_MESSAGE:
            return initialState.message;
        default:
            return state;
    }
}

function themeReducer(state = initialState.theme, action: Action) {
    switch (action.type) {
        case THEME_AVAILABLE:
            return action.theme || state;
        default:
            return state;
    }
}

function addressReducer(state = initialState.address, action: Action) {
    switch (action.type) {
        case SET_ADDRESS:
            return {
                backend: action.address.backend,
                frontend: action.address.frontend,
            };
        default:
            return state;
    }
}

/*
function widgetsDataReducer(state = initialState.widgetsData, action: Action) {
    switch (action.type) {
        case WIDGETS_DATA_AVAILABLE:
            return action.widgetsData;
        default:
            return state;
    }
}
*/

function typefacesReducer(state = initialState.typefaces, action: Action) {
    switch (action.type) {
        case TYPEFACES_AVAILABLE:
            return action.typefaces;
        default:
            return state;
    }
}

function configReducer(state = initialState.config, action: Action) {
    switch (action.type) {
        case CONFIG_AVAILABLE:
            return action.config;
        default:
            return state;
    }
}

const appReducers = combineReducers({
    auth: authReducer,
    siteinfo: siteinfoReducer,
    networkAction: networkActionReducer,
    profile: profileReducer,
    message: messageReducer,
    theme: themeReducer,
    address: addressReducer,
    typefaces: typefacesReducer,
    config: configReducer,
    //widgetsData: widgetsDataReducer,
});

const reducer = (state = initialState, action: Action) => {
    if (action.type === HYDRATE) {
        const nextState = {
            ...state,
            ...action.payload,
        };

        // preserve values on client side navigation
        if (!state.auth.guest) {
            nextState.auth = state.auth;
            nextState.profile = state.profile;
        }

        return nextState;
    } else {
        return appReducers(state, action);
    }
};

export default reducer;
