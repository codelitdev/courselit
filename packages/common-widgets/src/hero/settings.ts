export default interface Settings {
    title?: string;
    description?: string;
    buttonCaption?: string;
    buttonAction?: string;
    buttonBackground?: string;
    buttonForeground?: string;
    mediaId?: string;
    youtubeLink?: string;
    alignment?: "left" | "right";
    backgroundColor?: string;
    foregroundColor?: string;
    style: "card" | "normal";
}
