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
    private token?: string,
    private isGraphQLEndpoint?: boolean
  ) {}

  async exec() {
    const fetchOptions: Record<string, any> = {
      method: "POST",
      headers: {},
    };

    if (this.token) {
      fetchOptions.headers.Authorization = `Bearer ${this.token}`;
    }

    if (this.isGraphQLEndpoint) {
      fetchOptions.headers["Content-Type"] = "application/json";
      fetchOptions.body = JSON.stringify({ query: this.payload });
    } else {
      fetchOptions.body = this.payload;
    }

    let response: Record<string, any> = await fetch(this.url, fetchOptions);

    if (response.status === 401) {
      Router.push("/logout");
      return {};
    }

    response = await response.json();

    if (response.errors && response.errors.length > 0) {
      throw new Error(response.errors[0].message);
    }

    return this.isGraphQLEndpoint ? response.data : response;
  }
}

// const Fetch = function (url, payload, token, isGraphQLEndpoint) {
//   this.url = url;
//   this.payload = payload;
//   this.token = token;
//   this.isGraphQLEndpoint = isGraphQLEndpoint;
// };

// Fetch.prototype.exec = async function () {
//   const fetchOptions = {
//     method: "POST",
//     headers: {},
//   };

//   if (this.token) {
//     fetchOptions.headers.Authorization = `Bearer ${this.token}`;
//   }

//   if (this.isGraphQLEndpoint) {
//     fetchOptions.headers["Content-Type"] = "application/json";
//     fetchOptions.body = JSON.stringify({ query: this.payload });
//   } else {
//     fetchOptions.body = this.payload;
//   }

//   let response = await fetch(this.url, fetchOptions);

//   if (response.status === 401) {
//     Router.push("/logout");
//     return {};
//   }

//   response = await response.json();

//   if (response.errors && response.errors.length > 0) {
//     throw new Error(response.errors[0].message);
//   }

//   return this.isGraphQLEndpoint ? response.data : response;
// };
// interface FetchBuilder {
//   url: string;
//   payload: any;
//   token?: string;
//   isGraphQLEndpoint?: boolean
//   setUrl: (url: string) => void;
//   setPayload: (payload: any) => void;
//   setAuthToken: (token: string) => void;
//   setIsGraphQLEndpoint: (isGraphQLEndpoint: boolean) => void;
//   build: () => Fetch;
// }

class FetchBuilder {
  private url: string = "";
  private payload: any;
  private token: string = "";
  private isGraphQLEndpoint: boolean = false;

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

  build() {
    return new Fetch(
      this.url,
      this.payload,
      this.token,
      this.isGraphQLEndpoint
    );
  }
}

export default FetchBuilder;
