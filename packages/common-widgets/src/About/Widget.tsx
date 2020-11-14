import * as React from "react";
import { WidgetProps } from "@courselit/components-library";
import { connect } from "react-redux";
import { getWidgetSettings } from "../utils/settings";

export interface AboutWidgetProps extends WidgetProps {
    dispatch: any;
}

const Widget = (props: AboutWidgetProps) => {
    const { fetchBuilder, dispatch, name } = props;
    const [settings, setSettings] = React.useState<any>({});

    React.useEffect(() => {
        getSettings();
    });

    const getSettings = async () => {
        const settings = await getWidgetSettings({
            widgetName: name,
            fetchBuilder,
            dispatch,
        });
        setSettings(settings);
    };

  return <div>About</div>;
};

const mapDispatchToProps = (dispatch: any) => ({
  dispatch: dispatch,
});

export default connect(() => ({}), mapDispatchToProps)(Widget);
