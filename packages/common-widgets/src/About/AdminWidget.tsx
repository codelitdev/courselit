import * as React from "react";
import {
  WidgetProps,
  WidgetHelpers,
  RichText as TextEditor,
} from "@courselit/components-library";
import { connect } from "react-redux";
import { Button, Grid, Typography } from "@material-ui/core";
import Settings from "./Settings";

export interface AboutWidgetProps extends WidgetProps {
  auth: any;
  dispatch: any;
}

const AdminWidget = (props: AboutWidgetProps) => {
  const { fetchBuilder, dispatch, name, auth } = props;
  const [settings, setSettings] = React.useState<Settings>({
    text: TextEditor.emptyState(),
  });
  const [newSettings, setNewSettings] = React.useState<Settings>(settings);

  React.useEffect(() => {
    getSettings();
  }, []);

  const getSettings = async () => {
    const settings = await WidgetHelpers.getWidgetSettings({
      widgetName: name,
      fetchBuilder,
      dispatch,
    });

    if (settings) {
      onNewSettingsReceived(settings);
    }
  };

  const onNewSettingsReceived = (settings: any) => {
    const newSettings = Object.assign({}, settings, {
      text: settings.text
        ? TextEditor.hydrate({ data: settings.text })
        : TextEditor.emptyState(),
    });
    setSettings(newSettings);
    setNewSettings(newSettings);
  };

  const saveSettings = async (event: any) => {
    event.preventDefault();

    const result = await WidgetHelpers.saveWidgetSettings({
      widgetName: name,
      newSettings: Object.assign({}, newSettings, {
        text: TextEditor.stringify(newSettings.text),
      }),
      fetchBuilder,
      auth,
      dispatch,
    });
    onNewSettingsReceived(result);
  };

  const isDirty = (): boolean => {
    return settings !== newSettings;
  };

  const onChangeData = (editorState: any) => {
    setNewSettings(
      Object.assign({}, newSettings, {
        text: editorState,
      })
    );
  };

  return (
    <Grid container direction="column" spacing={2}>
      <Grid item xs>
        <Typography variant="h6" color="textSecondary">
          Compose
        </Typography>
      </Grid>
      <Grid item>
        <form onSubmit={saveSettings}>
          <TextEditor
            initialContentState={settings.text}
            onChange={onChangeData}
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

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(AdminWidget);
