import React from 'react'
import PropTypes from 'prop-types'
import Header from './Header.js'
import { connect } from 'react-redux'
import { Container, LinearProgress } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import CssBaseline from '@material-ui/core/CssBaseline'
import Head from 'next/head'
import {
  BACKEND
} from '../config/constants.js'
import {
  formulateMediaUrl
} from '../lib/utils.js'
import { siteInfoProps } from '../types.js'

const useStyles = makeStyles({
  root: {
    marginTop: 10
  },
  showProgressBar: props => ({
    visibility: props.networkAction ? 'visible' : 'hidden'
  })
})

const MasterLayout = (props) => {
  const classes = useStyles(props)
  return (
    <>
      <Head>
        {props.siteinfo.logopath &&
          <link rel="icon" href={formulateMediaUrl(BACKEND, props.siteinfo.logopath, true)}/>}
      </Head>
      <CssBaseline />
      <Header />
      <LinearProgress className={classes.showProgressBar}/>
      <Container maxWidth='md' className={classes.root}>
        {props.children}
      </Container>
    </>
  )
}

MasterLayout.propTypes = {
  children: PropTypes.object,
  networkAction: PropTypes.bool,
  siteinfo: siteInfoProps
}

const mapStateToProps = state => ({
  networkAction: state.networkAction,
  siteinfo: state.siteinfo
})

export default connect(
  mapStateToProps
)(MasterLayout)
