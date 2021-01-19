import * as React from "react";
import {
  WidgetProps,
  WidgetHelpers,
  RichText as TextEditor,
} from "@courselit/components-library";
import { connect } from "react-redux";
import Settings from "./Settings";
import { makeStyles } from "@material-ui/styles";
import { Grid, Theme } from "@material-ui/core";

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    padding: theme.spacing(2),
  },
}));

export interface AboutWidgetProps extends WidgetProps {
  dispatch: any;
}

const Widget = (props: AboutWidgetProps) => {
  const { fetchBuilder, dispatch, name } = props;
  const [settings, setSettings] = React.useState<Settings>({
    text: TextEditor.emptyState(),
  });
  const classes = useStyles();

  React.useEffect(() => {
    getSettings();
  }, []);

  const getSettings = async () => {
    const settings: any = await WidgetHelpers.getWidgetSettings({
      widgetName: name,
      fetchBuilder,
      dispatch,
    });

    if (settings) {
      hydrateAndSetSettings(settings);
    }
  };

  const hydrateAndSetSettings = (settings: Settings) => {
    const hydratedText = settings.text
      ? TextEditor.hydrate({ data: settings.text })
      : TextEditor.emptyState();
    setSettings(
      Object.assign({}, settings, {
        text: hydratedText,
      })
    );
  };

  return (
    <Grid item xs className={classes.container}>
      <TextEditor initialContentState={settings.text} readOnly={true} />
    </Grid>
  );
};

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(() => ({}), mapDispatchToProps)(Widget);
