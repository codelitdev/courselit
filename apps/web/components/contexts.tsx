import { createContext } from "react";
import { defaultState } from "./default-state";
import { Theme } from "@courselit/page-models";
import { Profile } from "@courselit/common-models";

export const AddressContext = createContext(defaultState.address);

export const SiteInfoContext = createContext(defaultState.siteinfo);

export const ProfileContext = createContext<{
    profile: Partial<Profile> | null;
    setProfile: any;
}>({ profile: null, setProfile: undefined });

export const TypefacesContext = createContext(defaultState.typefaces);

export const ServerConfigContext = createContext(defaultState.config);

export const ThemeContext = createContext<{
    theme: Theme;
    setTheme: any;
}>({ theme: defaultState.theme, setTheme: undefined });

export const FeaturesContext = createContext(defaultState.features);

// export const PageContext = createContext(defaultState.page);
