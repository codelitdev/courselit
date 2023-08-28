import Settings from "../settings";
interface CustomSettingsProps {
    name: string;
    settings: Settings;
    pageData: Record<string, unknown>;
    onChange: (...args: any[]) => void;
}
export default function CustomSettings({
    settings,
    onChange,
    pageData,
}: CustomSettingsProps): JSX.Element;
export {};
//# sourceMappingURL=custom-settings.d.ts.map
