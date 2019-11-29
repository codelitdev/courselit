import { createMuiTheme, responsiveFontSizes } from '@material-ui/core/styles'
import { red } from '@material-ui/core/colors'

const theme = createMuiTheme({
  palette: {
    primary: {
      main: '#556cd6'
    },
    secondary: {
      main: '#19857b',
      dark: '#eee'
    },
    error: {
      main: red.A400
    },
    background: {
      default: '#fff'
    }
  },
  overrides: {
    drawerWidth: 240
  }
})

export default responsiveFontSizes(theme)
