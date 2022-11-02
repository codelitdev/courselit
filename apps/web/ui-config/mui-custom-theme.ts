import { ThemeOptions } from "@mui/material/styles";

const themeOptions: ThemeOptions = {
    palette: {
        primary: {
            main: "#000000",
        },
        secondary: {
            main: "#545454",
        },
        background: {
            default: "#ffffff",
        },
    },
    typography: {
        fontFamily: "Source Sans Pro",
        fontSize: 14,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: 30,
                },
            },
        },
    },
};

export default themeOptions;
