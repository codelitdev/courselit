type fontWeight = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;

export interface Typeface {
    section:
        | "default"
        | "title"
        | "subtitle"
        | "body"
        | "navigation"
        | "button";
    typeface: string;
    fontWeights: fontWeight[];
    fontSize: number;
    lineHeight: number;
    letterSpacing: number;
    case: "uppercase" | "lowercase" | "captilize";
}
