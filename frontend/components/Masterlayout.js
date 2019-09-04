/**
 * Common layout for all pages
 */
// import { connect } from 'react-redux'
import React from 'react'
import PropTypes from 'prop-types'
import Header from './Header.js'
import { authProps } from '../types.js'
import { Grid, Container, makeStyles } from '@material-ui/core'

const useStyles = makeStyles({
  root: {
    marginTop: 10
  }
})

const MasterLayout = (props) => {
  const classes = useStyles()
  return (
    <Container maxWidth='md' className={classes.root}>
      <Grid container direction='column' spacing={2}>
        <Grid item>
          <Header
            className="header"
            title='Rayn Studios'
            subtitle='Learn to code'
            auth={props.auth}/>
        </Grid>
        <Grid item>
          {props.children}
        </Grid>
      </Grid>
    </Container>
  )
}

MasterLayout.propTypes = {
  children: PropTypes.array,
  auth: authProps
}

export default MasterLayout
