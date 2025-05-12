import Address from "../address";
import Auth from "../auth";
import Message from "../message";
import Profile from "../profile";
import SiteInfo from "../site-info";
import { Typeface } from "../typeface";
import { ServerConfig } from "../server-config";
import { UITheme } from "../ui-theme";

export default interface State {
    auth: Auth;
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Profile;
    address: Address;
    theme: Omit<UITheme, "draftTheme">;
    typefaces: Typeface[];
    message: Message;
    config: ServerConfig;
}
