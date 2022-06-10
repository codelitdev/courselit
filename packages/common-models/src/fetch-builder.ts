export default interface FetchBuilder {
    setUrl: (url: string) => FetchBuilder;
    setPayload: (query: string) => FetchBuilder;
    setIsGraphQLEndpoint: () => FetchBuilder;
    setHttpMethod: (httpMethod: string) => FetchBuilder;
    build: () => any;
}
