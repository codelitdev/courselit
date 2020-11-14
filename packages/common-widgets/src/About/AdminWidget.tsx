import * as React from "react";
import { WidgetProps } from "@courselit/components-library";
import { connect } from "react-redux";
import { getWidgetSettings, saveWidgetSettings } from "../utils/settings";
import { Button, Grid, Typography } from "@material-ui/core";
import TextEditor from "@courselit/rich-text";

export interface AboutWidgetProps extends WidgetProps {
  auth: any;
    dispatch: any;
}

const AdminWidget = (props: AboutWidgetProps) => {
    const { fetchBuilder, dispatch, name, auth } = props;
    const [settings, setSettings] = React.useState<any>({});
  const [newSettings, setNewSettings] = React.useState<any>({});

    React.useEffect(() => {
        getSettings();
    });

    const getSettings = async () => {
        const settings = await getWidgetSettings({
          widgetName: name,
          fetchBuilder,
          dispatch,
        });
        onNewSettingsReceived(settings);
    };

    const onNewSettingsReceived = (settings: any) => {
      setSettings(settings);
      setNewSettings(settings);
    };

    const saveSettings = async (event: any) => {
      event.preventDefault();
      const result = await saveWidgetSettings({
        widgetName: name,
        newSettings,
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
            initialContentState={TextEditor.emptyState()}
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
