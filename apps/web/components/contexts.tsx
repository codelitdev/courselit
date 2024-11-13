import { createContext } from "react";
import { defaultState } from "./default-state";

export const AddressContext = createContext(defaultState.address);

export const SiteInfoContext = createContext(defaultState.siteinfo);

export const ProfileContext = createContext(defaultState.profile);
