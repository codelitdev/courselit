import { AppState } from "@courselit/state-management";
import { ComponentType } from "react";
import { connect } from "react-redux";
import widgets from "../../../ui-config/widgets";

interface AdminWidgetProps {
    name: string;
    settings: Record<string, unknown>;
    onChange: (...args: any[]) => void;
    hideActionButtons: (
        e: boolean,
        preservedStateAcrossRerender: Record<string, unknown>,
    ) => void;
    preservedStateAcrossRerender: Record<string, unknown>;
    pageData: Record<string, unknown>;
}

function AdminWidget({
    name,
    settings,
    onChange,
    hideActionButtons,
    preservedStateAcrossRerender,
    pageData,
}: AdminWidgetProps) {
    const AdminWidget = widgets[name].adminWidget;
    const AdminWidgetWithStateAndDispatch: any = connect(
        (state: AppState) => state,
    )(AdminWidget as ComponentType<never>);

    return (
        <AdminWidgetWithStateAndDispatch
            name={name}
            settings={settings}
            onChange={onChange}
            hideActionButtons={hideActionButtons}
            preservedStateAcrossRerender={preservedStateAcrossRerender}
            pageData={pageData}
        />
    );
}

export default AdminWidget;
