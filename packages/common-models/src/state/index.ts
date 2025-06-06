import Address from "../address";
import Auth from "../auth";
import Message from "../message";
import Profile from "../profile";
import SiteInfo from "../site-info";
import { Typeface } from "../typeface";
import { ServerConfig } from "../server-config";
import { Theme } from "@courselit/page-models";

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
