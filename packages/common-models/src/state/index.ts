import Address from "../address";
import Auth from "../auth";
import Profile from "../profile";
import SiteInfo from "../site-info";
import Theme from "../theme";
import { Typeface } from "../typeface";

export default interface State {
    auth: Auth;
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Profile;
    address: Address;
    theme: Theme;
    featureFlags: string[];
    typefaces: Typeface[];
}
