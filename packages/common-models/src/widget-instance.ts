export default interface WidgetInstance {
    widgetId: string;
    name: string;
    settings: Record<string, unknown>;
    deleteable: boolean;
}
