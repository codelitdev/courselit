/**
 * A utility class to make network calls and intercept the response. It is
 * useful for cases like redirection to the login page if the server returned
 * a 401 etc.
 */

import Router from "next/router";

class Fetch {
  constructor(
    private url: string,
    private payload: any,
    private httpMethod: string,
    private isGraphQLEndpoint?: boolean
  ) {}

  async exec() {
    const fetchOptions: Record<string, any> = {
      method: this.httpMethod,
      credentials: "same-origin",
      headers: {},
    };

    if (this.isGraphQLEndpoint) {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify({ query: this.payload });
    } else {
      fetchOptions.body = this.payload;
    }

    let response: Record<string, any> = await fetch(this.url, fetchOptions);

    if (response.status === 401) {
      typeof window !== "undefined" && Router.replace("/logout");
      return;
    }

    response = await response.json();

    if (response.error) {
      throw new Error(response.error);
    }

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    return this.isGraphQLEndpoint ? response.data : response;
  }
}

class FetchBuilder {
  private url: string = "";
  private payload: any;
  private token: string = "";
  private isGraphQLEndpoint: boolean = false;
  private httpMethod: string = "POST";

  setUrl(url: string) {
    this.url = url;
    return this;
  }

  setPayload(payload: any) {
    this.payload = payload;
    return this;
  }

  setAuthToken(token: string) {
    this.token = token;
    return this;
  }

  setIsGraphQLEndpoint(isGraphQLEndpoint: boolean) {
    this.isGraphQLEndpoint = isGraphQLEndpoint;
    return this;
  }

  setHttpMethod(httpMethod: string) {
    this.httpMethod = httpMethod;
    return this;
  }

  build() {
    return new Fetch(
      this.url,
      this.payload,
      this.httpMethod,
      this.isGraphQLEndpoint
    );
  }
}

export default FetchBuilder;
