import widgets from "@/ui-config/widgets";
import { State } from "@courselit/common-models";

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
    state: State;
}

export default function AdminWidget({
    name,
    settings,
    onChange,
    hideActionButtons,
    preservedStateAcrossRerender,
    pageData,
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
            {...state}
        />
    );
}
