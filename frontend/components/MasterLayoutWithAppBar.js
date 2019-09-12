import React from 'react'
import PropTypes from 'prop-types'
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton
} from '@material-ui/core'
import MenuIcon from '@material-ui/icons/Menu'
import { makeStyles } from '@material-ui/styles'

const useStyles = makeStyles(theme => ({
  root: {
    flexGrow: 1
  },
  title: {
    flexGrow: 1
  }
}))
const MasterLayoutWithAppBar = (props) => {
  const classes = useStyles()

  return (
    <div classes={classes.root}>
      <AppBar position='fixed'>
        <Toolbar>
          <IconButton edge='start' color='inherit' aria-label='menu'>
            <MenuIcon />
          </IconButton>
          <Typography variant='h6' className={classes.title}>Creator</Typography>
          <Button color='inherit'>Logout</Button>
        </Toolbar>
      </AppBar>
      {props.children}
    </div>
  )
}

MasterLayoutWithAppBar.propTypes = {
  title: PropTypes.string,
  children: PropTypes.object
}

export default MasterLayoutWithAppBar
