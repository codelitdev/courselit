import Address from "./address";
import Auth from "./auth";
import Layout from "./layout";
import Link from "./link";
import Profile from "./profile";
import SiteInfo from "./site-info";

export default interface State {
    siteinfo: SiteInfo;
    profile: Profile;
    networkAction: boolean;
    navigation: Link[];
    layout: Layout;
    address: Address;
    auth: Auth;
}
