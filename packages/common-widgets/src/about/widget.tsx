import * as React from "react";
import {
  WidgetHelpers,
  RichText as TextEditor,
  Section,
} from "@courselit/components-library";
import Settings from "./settings";
import { Box, Grid } from "@mui/material";
import type { FetchBuilder, WidgetProps } from "@courselit/common-models";
import Metadata from "./metadata";

const Widget = (props: WidgetProps) => {
  const { state } = props;
  const widgetSettings: any = state.widgetsData.about.settings;
  const [content, setContent] = React.useState(
    widgetSettings
      ? TextEditor.hydrate({ data: widgetSettings.text })
      : TextEditor.emptyState()
  );

  return (
    <Grid item xs={12}>
      <Section>
        <Box
          sx={{
            pl: 2,
            pr: 2,
          }}
        >
          <TextEditor initialContentState={content} readOnly={true} />
        </Box>
      </Section>
    </Grid>
  );
};

Widget.getData = async function getData({
  fetchBuilder,
}: {
  fetchBuilder: FetchBuilder;
}) {
  const settingsQuery = `
    query {
        settings: getWidgetSettings(name: "${Metadata.name}") {
            settings
        }
    }
    `;

  const fetch = fetchBuilder.setPayload(settingsQuery).build();
  let result: Record<string, unknown> = {};
  try {
    const response = await fetch.exec();
    if (!response.settings) {
      return result;
    }
    result.settings = JSON.parse(response.settings.settings);
  } catch (err) {
    console.error(err);
  }

  return result;
};

export default Widget;
