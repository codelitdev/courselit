import Address from "./address";
import Auth from "./auth";
import Layout from "./layout";
import Link from "./link";
import Profile from "./profile";
import SiteInfo from "./site-info";
import WidgetsData from "./widgets-data";
import Theme from "./theme";

export default interface State {
    auth: Auth;
    siteinfo: SiteInfo;
    networkAction: boolean;
    profile: Profile;
    navigation: Link[];
    layout: Layout;
    address: Address;
    widgetsData: WidgetsData;
    theme: Theme;
}
