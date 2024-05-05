export default interface Theme {
    name: string;
    active: boolean;
    styles: Record<string, unknown>;
    screenshot?: string;
    url?: string;
}
