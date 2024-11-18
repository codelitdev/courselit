import { AppDispatch, AppState } from "@courselit/state-management";
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
    dispatch: AppDispatch;
    state: AppState;
}

export default function AdminWidget({
    name,
    settings,
    onChange,
    hideActionButtons,
    preservedStateAcrossRerender,
    pageData,
    dispatch,
    state,
}: AdminWidgetProps) {
    const AdminWidget = widgets[name].adminWidget;

    return (
        <AdminWidget
            name={name}
            settings={settings}
            onChange={onChange}
            hideActionButtons={hideActionButtons}
            preservedStateAcrossRerender={preservedStateAcrossRerender}
            pageData={pageData}
            dispatch={dispatch}
            {...state}
        />
    );
}
