import { authUrls, oauthProviderInput } from "./options.js";

export function composeOAuthProviderOptions(publicApiUrl: string) {
  const urls = authUrls(publicApiUrl);
  return {
    issuer: urls.issuer,
    options: oauthProviderInput(urls),
  };
}
