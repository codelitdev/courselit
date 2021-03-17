import fetch from "isomorphic-unfetch";
import {
  URL_EXTENTION_POSTS,
  URL_EXTENTION_COURSES,
} from "../config/constants.js";
import { RichText as TextEditor } from "@courselit/components-library";

export const queryGraphQL = async (url, query, token) => {
  const options = {
    method: "POST",
    headers: token
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        }
      : { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  };
  let response = await fetch(url, options);
  response = await response.json();

  if (response.errors && response.errors.length > 0) {
    throw new Error(response.errors[0].message);
  }

  return response.data;
};

export const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

export const queryGraphQLWithUIEffects = (
  backend,
  dispatch,
  networkAction,
  token
) => async (query) => {
  try {
    dispatch(networkAction(false));
    const response = await queryGraphQL(`${backend}/graph`, query, token);

    return response;
  } finally {
    dispatch(networkAction(false));
  }
};

export const formattedLocaleDate = (epochString) =>
  new Date(Number(epochString)).toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

// Regex copied from: https://stackoverflow.com/a/48675160/942589
export const makeGraphQLQueryStringFromJSObject = (obj) =>
  JSON.stringify(obj).replace(/"([^(")"]+)":/g, "$1:");

export const formulateMediaUrl = (
  backend,
  mediaID,
  generateThumbnailUrl = false
) =>
  mediaID
    ? `${backend}/media/${mediaID}${generateThumbnailUrl ? "?thumb=1" : ""}`
    : "";

export const formulateCourseUrl = (course, backend = "") =>
  `${backend}/${course.isBlog ? URL_EXTENTION_POSTS : URL_EXTENTION_COURSES}/${
    course.courseId
  }/${course.slug}`;

export const getPostDescriptionSnippet = (rawDraftJSContentState) => {
  const firstSentence = TextEditor.hydrate({ data: rawDraftJSContentState })
    .getCurrentContent()
    .getPlainText()
    .split(".")[0];

  return firstSentence ? firstSentence + "." : firstSentence;
};

export const getGraphQLQueryFields = (
  jsObj,
  fieldsNotPutBetweenQuotes = []
) => {
  let queryString = "{";
  for (const i of Object.keys(jsObj)) {
    if (jsObj[i] !== undefined) {
      queryString += fieldsNotPutBetweenQuotes.includes(i)
        ? `${i}: ${jsObj[i]},`
        : `${i}: "${jsObj[i]}",`;
    }
  }
  queryString += "}";

  return queryString;
};

export const getObjectContainingOnlyChangedFields = (baseline, obj) => {
  const result = {};
  for (const i of Object.keys(baseline)) {
    if (baseline[i] !== obj[i]) {
      result[i] = obj[i];
    }
  }
  return result;
};

export const areObjectsDifferent = (baseline, obj) => {
  const onlyChangedFields = getObjectContainingOnlyChangedFields(baseline, obj);
  return !!Object.keys(onlyChangedFields).length;
};

export const getAddress = (host) => {
  return {
    domain: extractDomainFromURL(host),
    backend: getBackendAddress(host),
    frontend: `http://${host}`,
  };
};

export const getBackendAddress = (host) => {
  const domain = extractDomainFromURL(host);

  if (process.env.NODE_ENV === "production") {
    return `${
      process.env.INSECURE === "true" ? "http" : "https"
    }://${domain}/api`;
  } else {
    return `http://${domain}:8000`;
  }
};

const extractDomainFromURL = (host) => {
  return host.split(":")[0];
};
