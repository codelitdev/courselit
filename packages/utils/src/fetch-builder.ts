/**
 * A utility class to make network calls and intercept the response. It is
 * useful for cases like redirection to the login page if the server returned
 * a 401 etc.
 */

import { debuglog } from "util";

const debugLog = debuglog("fetch-builder");

interface ExecOptions {
    redirectToOnUnAuth?: string;
}

class Fetch {
    constructor(
        private url: string,
        private payload: unknown,
        private httpMethod: string,
        private isGraphQLEndpoint?: boolean,
        private headers?: Record<string, string>,
    ) {}

    async exec(options?: ExecOptions) {
        const fetchOptions: any = {
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

        if (this.headers) {
            fetchOptions.headers = Object.assign(
                fetchOptions.headers,
                this.headers,
            );
        }

        let response: Record<string, any> = await fetch(this.url, fetchOptions);

        debugLog(
            `${this.url}`,
            fetchOptions,
            response.status,
            options ? options.redirectToOnUnAuth : "",
        );

        if (response.status === 401) {
            if (typeof window !== "undefined") {
                window.location.href =
                    options && options.redirectToOnUnAuth
                        ? `/login?redirect=${options.redirectToOnUnAuth}`
                        : "/logout";
            }
            return {};
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
    private url = "";
    private payload: any;
    private isGraphQLEndpoint = false;
    private httpMethod = "POST";
    private headers = {};

    setUrl(url: string) {
        this.url = url;
        return this;
    }

    setPayload(payload: unknown) {
        this.payload = payload;
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

    setHeaders(headers: Record<string, string>) {
        this.headers = headers;
        return this;
    }

    build() {
        return new Fetch(
            this.url,
            this.payload,
            this.httpMethod,
            this.isGraphQLEndpoint,
            this.headers,
        );
    }
}

export default FetchBuilder;
