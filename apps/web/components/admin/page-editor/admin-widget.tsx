import { Address } from "@courselit/common-models";
import { AppState } from "@courselit/state-management";
import { ComponentType } from "react";
import { connect } from "react-redux";
import widgets from "../../../ui-config/widgets";

interface AdminWidgetProps {
    id: string;
    settings: Record<string, unknown>;
    onChange: (...args: any[]) => void;
    address: Address;
}

function AdminWidget({ id, settings, onChange }: AdminWidgetProps) {
    const AdminWidget = widgets[id].adminWidget;
    const AdminWidgetWithStateAndDispatch: any = connect(
        (state: AppState) => state
    )(AdminWidget as ComponentType<never>);

    return (
        <AdminWidgetWithStateAndDispatch
            settings={settings}
            onChange={onChange}
        />
    );
}

export default AdminWidget;
