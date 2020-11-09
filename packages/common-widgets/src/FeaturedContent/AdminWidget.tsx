import * as React from "react";
import { WidgetProps } from "@courselit/components-library";
import { connect } from "react-redux";
import { Button, Grid, TextField, Typography } from "@material-ui/core";

export interface AdminWidgetProps extends WidgetProps {
  auth: any;
}

const AdminWidget = (props: AdminWidgetProps) => {
  const { name, fetchBuilder, auth } = props;
  const [settings, setSettings] = React.useState<any>({});
  const [newSettings, setNewSettings] = React.useState<any>({});

  React.useEffect(() => {
    getSettings();
  }, [name]);

  const getSettings = async () => {
    const query = `
        query {
            settings: getWidgetSettings(name: "${name}") {
                settings
            }
        }
        `;

    const fetch = fetchBuilder.setPayload(query).build();
    try {
      const response = await fetch.exec();
      if (response.settings) {
        onNewSettingsReceived(response.settings.settings);
      }
    } catch (err) {}
  };

  const onNewSettingsReceived = (settings: any) => {
    const parsedSettings = JSON.parse(settings);
    setSettings(parsedSettings);
    setNewSettings(parsedSettings);
  };

  const saveWidgetSettings = async (event: any) => {
    event.preventDefault();

    const mutation = `
        mutation {
          settings: saveWidgetSettings(widgetSettingsData: {
            name: "${name}",
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
    try {
      const response = await fetch.exec();
      if (response.settings) {
        onNewSettingsReceived(response.settings.settings);
      }
    } catch (err) {}
  };

  const onChangeData = (e: any) => {
    setNewSettings(
      Object.assign({}, newSettings, {
        [e.target.name]: e.target.value,
      })
    );
  };

  const isDirty = (): boolean => {
    return settings !== newSettings;
  };

  return (
    <Grid container direction="column" spacing={2}>
      <Grid item xs>
        <Typography variant="h6" color="textSecondary">
          Settings
        </Typography>
      </Grid>
      <Grid item>
        <form onSubmit={saveWidgetSettings}>
          <TextField
            variant="outlined"
            label="Section Title"
            fullWidth
            margin="normal"
            name="title"
            value={newSettings.title || ""}
            onChange={onChangeData}
            required
          />
          <TextField
            variant="outlined"
            label="Section Title"
            fullWidth
            margin="normal"
            name="subtitle"
            value={newSettings.subtitle || ""}
            onChange={onChangeData}
            required
          />
          <Button
            variant="contained"
            color="primary"
            type="submit"
            value="Save"
            disabled={!isDirty()}
          >
            Save
          </Button>
        </form>
      </Grid>
    </Grid>
  );
};

const mapStateToProps = (state: any) => ({
  auth: state.auth,
});

export default connect(mapStateToProps)(AdminWidget);
