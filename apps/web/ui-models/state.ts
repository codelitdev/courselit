import Address from "./address";
import Auth from "./auth";
import Layout from "./layout";
import Profile from "./profile";
import SiteInfo from "./site-info";

export default interface State {
    siteinfo: SiteInfo;
    profile: Profile;
    networkAction: boolean;
    layout: Layout;
    address: Address;
    auth: Auth;
}
