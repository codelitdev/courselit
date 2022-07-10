import { Address } from "@courselit/common-models";
import { AppState } from "@courselit/state-management";
import { FetchBuilder } from "@courselit/utils";
import { useTheme } from "@mui/material";
import { ComponentType } from "react";
import { connect } from "react-redux";
import widgets from "../../../ui-config/widgets";

interface AdminWidgetProps {
    id: string;
    settings: Record<string, unknown>;
    onChange: (...args: any[]) => void;
    address: Address;
}

function AdminWidget({ id, settings, onChange, address }: AdminWidgetProps) {
    const AdminWidget = widgets[id].adminWidget;
    const AdminWidgetWithStateAndDispatch: any = connect(
        (state: AppState) => state
    )(AdminWidget as ComponentType<never>);
    const theme = useTheme();
    const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/api/graph`)
        .setIsGraphQLEndpoint(true);

    return (
        <AdminWidgetWithStateAndDispatch
            settings={settings}
            onChange={onChange}
            fetchBuilder={fetch}
            theme={theme}
        />
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(AdminWidget);
