export default interface Settings {
    title?: string;
    subtitle?: string;
    btnText?: string;
    backgroundColor?: `#${string}`;
    foregroundColor?: `#${string}`;
    btnBackgroundColor?: `#${string}`;
    btnForegroundColor?: `#${string}`;
    alignment?: "left" | "right" | "center";
    successMessage?: string;
    failureMessage?: string;
}
