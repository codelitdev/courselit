import { FetchBuilder } from "./Widget";

interface Auth {
  token: string;
}

interface GetSettings {
  widgetName: string;
  fetchBuilder: FetchBuilder;
  dispatch: any;
}

interface SaveSettings {
  widgetName: string;
  newSettings: any;
  fetchBuilder: FetchBuilder;
  auth: Auth;
  dispatch: any;
}

const getWidgetSettings = async ({
  widgetName,
  fetchBuilder,
  dispatch,
}: GetSettings) => {
  const query = `
    query {
      settings: getWidgetSettings(name: "${widgetName}") {
        settings
      }
    }
    `;

  const fetch = fetchBuilder.setPayload(query).build();
  let result = {};
  try {
    dispatch({ type: "NETWORK_ACTION", flag: true });
    const response = await fetch.exec();
    if (response.settings) {
      result = JSON.parse(response.settings.settings);
    }
  } catch (err) {
    throw err;
  } finally {
    dispatch({ type: "NETWORK_ACTION", flag: false });
  }

  return result;
};

const saveWidgetSettings = async ({
  widgetName,
  newSettings,
  fetchBuilder,
  auth,
  dispatch,
}: SaveSettings) => {
  const mutation = `
    mutation {
        settings: saveWidgetSettings(widgetSettingsData: {
        name: "${widgetName}",
        settings: "${JSON.stringify(newSettings).replace(/"/g, '\\"')}"
        }) {
        settings
        }
    }
    `;

  const fetch = fetchBuilder
    .setPayload(mutation)
    .setAuthToken(auth.token)
    .build();
  let result;
  try {
    dispatch({ type: "NETWORK_ACTION", flag: true });
    const response = await fetch.exec();
    if (response.settings) {
      result = JSON.parse(response.settings.settings);
    }
  } catch (err) {
    throw err;
  } finally {
    dispatch({ type: "NETWORK_ACTION", flag: false });
  }

  return result;
};

export default { getWidgetSettings, saveWidgetSettings };
