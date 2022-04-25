import * as React from "react";
import {
  WidgetHelpers,
  RichText as TextEditor,
  Section,
} from "@courselit/components-library";
import Settings from "./Settings";
import { Grid, Theme } from "@mui/material";
import type { WidgetProps } from "@courselit/common-models";

const Widget = (props: WidgetProps) => {
  const { fetchBuilder, dispatch, name } = props;
  const [settings, setSettings] = React.useState<Settings>({
    text: TextEditor.emptyState(),
  });

  React.useEffect(() => {
    getSettings();
  }, []);

  const getSettings = async () => {
    console.log("From about widget", props);
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
    <Grid item xs>
      <Section>
        <TextEditor initialContentState={settings.text} readOnly={true} />
      </Section>
    </Grid>
  );
};

export default Widget;
