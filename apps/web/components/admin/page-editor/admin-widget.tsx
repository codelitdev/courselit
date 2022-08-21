import { AppState } from "@courselit/state-management";
import { ComponentType } from "react";
import { connect } from "react-redux";
import widgets from "../../../ui-config/widgets";

interface AdminWidgetProps {
    name: string;
    settings: Record<string, unknown>;
    onChange: (...args: any[]) => void;
}

function AdminWidget({ name, settings, onChange }: AdminWidgetProps) {
    const AdminWidget = widgets[name].adminWidget;
    const AdminWidgetWithStateAndDispatch: any = connect(
        (state: AppState) => state
    )(AdminWidget as ComponentType<never>);

    return (
        <AdminWidgetWithStateAndDispatch
            name={name}
            settings={settings}
            onChange={onChange}
        />
    );
}

export default AdminWidget;
