export default interface WidgetInstance {
    widgetId: string;
    name: string;
    deleteable: boolean;
    shared: boolean;
    settings?: Record<string, unknown>;
}
