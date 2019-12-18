import { createMuiTheme, responsiveFontSizes } from '@material-ui/core/styles'
import { red } from '@material-ui/core/colors'

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#1d1b1b'
    },
    secondary: {
      main: '#ec4d37',
      dark: '#eee'
    },
    error: {
      main: red.A400
    },
    background: {
      default: '#fff'
    },
    contrastThreshold: 3
  },
  overrides: {
    drawerWidth: 240
  }
})

export default responsiveFontSizes(theme)
