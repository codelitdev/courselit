import React, { useState, useEffect } from 'react'
import AppBar from '@material-ui/core/AppBar'
import CssBaseline from '@material-ui/core/CssBaseline'
import Divider from '@material-ui/core/Divider'
import Drawer from '@material-ui/core/Drawer'
import Hidden from '@material-ui/core/Hidden'
import IconButton from '@material-ui/core/IconButton'
import List from '@material-ui/core/List'
import ListItem from '@material-ui/core/ListItem'
import ListItemIcon from '@material-ui/core/ListItemIcon'
import ListItemText from '@material-ui/core/ListItemText'
import { Menu } from '@material-ui/icons'
import { Toolbar, Typography, Grid } from '@material-ui/core'
import { makeStyles, useTheme } from '@material-ui/core/styles'
import PropTypes from 'prop-types'
import SessionButton from './SessionButton.js'
import AppToast from './AppToast'

const drawerWidth = 240

const useStyles = makeStyles(theme => ({
  root: {
    display: 'flex'
  },
  drawer: {
    [theme.breakpoints.up('sm')]: {
      width: drawerWidth,
      flexShrink: 0
    }
  },
  appBar: {
    marginLeft: drawerWidth,
    [theme.breakpoints.up('sm')]: {
      width: `calc(100% - ${drawerWidth}px)`
    }
  },
  menuButton: {
    marginRight: theme.spacing(2),
    [theme.breakpoints.up('sm')]: {
      display: 'none'
    }
  },
  toolbar: theme.mixins.toolbar,
  drawerPaper: {
    width: drawerWidth
  },
  content: {
    flexGrow: 1,
    padding: theme.spacing(3)
  }
}))

const IconComponent = props => (
  <Grid item>
    <ListItemIcon>
      {props.icon}
    </ListItemIcon>
  </Grid>
)

const ResponsiveDrawer = (props) => {
  const classes = useStyles()
  const theme = useTheme()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [visibleComponent, setVisibleComponent] = useState()

  useEffect(() => {
    showComponent(props.items[0].element)
  }, [])

  function handleDrawerToggle () {
    setMobileOpen(!mobileOpen)
  }

  function showComponent (item) {
    setVisibleComponent(item)
  }

  const drawer = (
    <div>
      <div className={classes.toolbar} />
      <Divider />
      <List>
        {(props.items).map((item, index) => (
          <ListItem button key={item.name} onClick={() => showComponent(item.element)}>
            <Grid container direction='row' alignItems='center'>
              {item.icon &&
                !item.iconPlacementRight &&
                <IconComponent icon={item.icon}/>}
              <Grid item>
                <ListItemText primary={item.name} />
              </Grid>
              {item.icon &&
                item.iconPlacementRight &&
                <IconComponent icon={item.icon}/>}
            </Grid>
          </ListItem>
        ))}
      </List>
      {/* <Divider />
      <List>
        {['Market'].map((text, index) => (
          <ListItem button key={text}>
            <ListItemIcon><ShoppingCart /></ListItemIcon>
            <ListItemText primary={text} />
          </ListItem>
        ))}
      </List> */}
    </div>
  )

  return (
    <div className={classes.root}>
      <CssBaseline />
      <AppBar position="fixed" className={classes.appBar}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            className={classes.menuButton}>
            <Menu />
          </IconButton>
          <Grid container justify='space-between'>
            <Grid item>
              <Typography variant="h6" noWrap>
                {props.pageTitle}
              </Typography>
            </Grid>
            <Grid item>
              <SessionButton />
            </Grid>
          </Grid>
        </Toolbar>
      </AppBar>
      <nav className={classes.drawer} aria-label="mailbox folders">
        {/* The implementation can be swapped with js to avoid SEO duplication of links. */}
        <Hidden smUp implementation="css">
          <Drawer
            variant="temporary"
            anchor={theme.direction === 'rtl' ? 'right' : 'left'}
            open={mobileOpen}
            onClose={handleDrawerToggle}
            classes={{
              paper: classes.drawerPaper
            }}
            ModalProps={{
              keepMounted: true // Better open performance on mobile.
            }}
          >
            {drawer}
          </Drawer>
        </Hidden>
        <Hidden xsDown implementation="css">
          <Drawer
            classes={{
              paper: classes.drawerPaper
            }}
            variant="permanent"
            open
          >
            {drawer}
          </Drawer>
        </Hidden>
      </nav>
      <main className={classes.content}>
        <div className={classes.toolbar} />
        {visibleComponent}
      </main>
      <AppToast />
    </div>
  )
}

IconComponent.propTypes = {
  icon: PropTypes.object
}

ResponsiveDrawer.propTypes = {
  pageTitle: PropTypes.string,
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    element: PropTypes.object.isRequired,
    icon: PropTypes.object,
    props: PropTypes.object,
    progress: PropTypes.shape({
      status: PropTypes.bool.isRequired
    })
  }))
}

export default ResponsiveDrawer
