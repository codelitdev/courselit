export default interface SiteInfo {
  title: string;
  subtitle: string;
  logopath: {
    file: string;
    thumbnail: string;
  };
  currencyUnit?: string;
  currencyISOCode?: string;
  paymentMethod?: string;
  stripePublishableKey?: string;
  codeInjectionHead?: string;
}
