/**
 * A utility class to make network calls and intercept the response. It is
 * useful for cases like redirection to the login page if the server returned
 * a 401 etc.
 */

import fetch from "isomorphic-unfetch";
import Router from "next/router";

const Fetch = function (url, payload, token, isGraphQLEndpoint) {
  this.url = url;
  this.payload = payload;
  this.token = token;
  this.isGraphQLEndpoint = isGraphQLEndpoint;
};

Fetch.prototype.exec = async function () {
  const fetchOptions = {
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

  let response = await fetch(this.url, fetchOptions);

  if (response.status === 401) {
    Router.push("/logout");
    return {};
  }

  response = await response.json();

  if (response.errors && response.errors.length > 0) {
    throw new Error(response.errors[0].message);
  }

  return this.isGraphQLEndpoint ? response.data : response;
};

const FetchBuilder = function () {
  return {
    setUrl: function (url) {
      this.url = url;
      return this;
    },
    setPayload: function (payload) {
      this.payload = payload;
      return this;
    },
    setAuthToken: function (token) {
      this.token = token;
      return this;
    },
    setIsGraphQLEndpoint: function (isGraphQLEndpoint) {
      this.isGraphQLEndpoint = isGraphQLEndpoint;
      return this;
    },
    build: function () {
      return new Fetch(
        this.url,
        this.payload,
        this.token,
        this.isGraphQLEndpoint
      );
    },
  };
};

export default FetchBuilder;
