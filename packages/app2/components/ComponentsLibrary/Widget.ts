interface FetchBuilder {
  setUrl: (url: string) => FetchBuilder;
  setPayload: (query: string) => FetchBuilder;
  setAuthToken: (token: string) => FetchBuilder;
  setIsGraphQLEndpoint: () => FetchBuilder;
  build: () => any;
}

interface WidgetProps {
  name: string;
  fetchBuilder: FetchBuilder;
  section: string;
  config: any;
  utilities: any;
}

export { FetchBuilder, WidgetProps };
