import type { State, SiteInfo, Typeface } from "@courselit/common-models";
import { ThunkAction } from "redux-thunk";
import { AnyAction } from "redux";
import { ServerConfig } from "@courselit/common-models";
import { Theme } from "@courselit/page-models";
export declare function signedIn(): (dispatch: any) => Promise<void>;
export declare function refreshUserProfile(): ThunkAction<void, State, unknown, AnyAction>;
export declare function signedOut(): (dispatch: any) => void;
export declare function authChecked(): (dispatch: any) => void;
export declare function networkAction(flag: boolean): (dispatch: any) => any;
export declare function updateProfile(profile: any): {
    type: string;
    profile: any;
};
export declare function clearProfile(): {
    type: string;
};
export declare function updateSiteInfo(): ThunkAction<void, State, unknown, AnyAction>;
export declare function updateConfig(): ThunkAction<void, State, unknown, AnyAction>;
export declare function newConfigAvailable(config: ServerConfig): {
    type: string;
    config: ServerConfig;
};
export declare function newSiteInfoAvailable(info: SiteInfo): {
    type: string;
    siteinfo: SiteInfo;
};
export declare function themeAvailable(theme: Theme): {
    type: string;
    theme: Theme;
};
export declare function updateBackend(host: string): AnyAction;
export declare function typefacesAvailable(typefaces: Typeface[]): AnyAction;
//# sourceMappingURL=action-creators.d.ts.map