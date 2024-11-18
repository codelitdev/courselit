import Address from "../address";
import Auth from "../auth";
import Message from "../message";
import Profile from "../profile";
import SiteInfo from "../site-info";
import Theme from "../theme";
import { Typeface } from "../typeface";
import { ServerConfig } from "../server-config";

export default interface State {
    auth: Auth;
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Profile;
    address: Address;
    theme: Theme;
    typefaces: Typeface[];
    message: Message;
    config: ServerConfig;
}
