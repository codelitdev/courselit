export default interface Theme {
    id: string;
    name: string;
    active: boolean;
    styles: Record<string, unknown>;
    url?: string;
}
