import { createMuiTheme, responsiveFontSizes } from "@material-ui/core/styles";

const theme = createMuiTheme({
  palette: {
    primary: {
      main: "#1d1b1b",
    },
    secondary: {
      main: "#ec4d37",
      dark: "#eee",
    },
    error: {
      main: "ff1744",
    },
    background: {
      default: "#f5f5f5",
    },
    contrastThreshold: 3,
  },
  overrides: {
    drawerWidth: 240,
  },
});

export default responsiveFontSizes(theme);
