import { createMuiTheme } from '@material-ui/core/styles'
import { red } from '@material-ui/core/colors'

const theme = createMuiTheme({
  // spacing: 8,
  palette: {
    primary: {
      main: '#556cd6'
    },
    secondary: {
      main: '#19857b'
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

export default theme
