interface Auth {
  guest: boolean;
  token: string;
  userid: string;
  checked: boolean;
}

interface SiteInfo {
  title: string;
  subtitle: string;
  logopath: string;
  currencyUnit: string;
  currencyISOCode: string;
  paymentMethod: string;
  stripePublishableKey: string;
  themePrimaryColor: string;
  themeSecondaryColor: string;
  codeInjectionHead: string;
}

interface Profile {
  isCreator: boolean;
  name: string;
  id: string;
  fetched: boolean;
  isAdmin: boolean;
  purchases: string[];
  email: string;
}

interface Message {
  open: boolean;
  message: string;
  action: () => {} | null;
}

interface Layout {
  top: string[];
  bottom: string[];
  aside: string[];
  footerLeft: string[];
  footerRight: string[];
}

type NetworkAction = boolean;

type Theme = any;

type Navigation = any[];

interface AppState {
  auth: Auth;
  siteinfo: SiteInfo;
  networkAction: NetworkAction;
  profile: Profile;
  message: Message;
  theme: Theme;
  layout: Layout;
  navigation: Navigation;
}

export default AppState;
