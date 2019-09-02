/**
 * This component displays the title, subtitle and logo
 * of the website.
 */

import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import Link from 'next/link'
import Img from './Img'
import { Grid } from '@material-ui/core'

const Branding = (props) => (
  <Grid container direction='row'>
    <Grid item>
      <Link href='/'>
        <a>
          <Img src={props.logoPath} isThumbnail={true}/>
        </a>
      </Link>
    </Grid>
    <Grid item>
      <Grid container direction='column'>
        <Grid item>
          <p>{props.title}</p>
        </Grid>
        <Grid item>
          <p>{props.subtitle}</p>
        </Grid>
      </Grid>
    </Grid>
  </Grid>
)

Branding.propTypes = {
  title: PropTypes.string,
  subtitle: PropTypes.string,
  logoPath: PropTypes.string,
  backend: PropTypes.string
}

const mapStateToProps = state => ({
  title: state.siteinfo.title,
  subtitle: state.siteinfo.subtitle,
  logoPath: state.siteinfo.logopath
})

export default connect(
  mapStateToProps
)(Branding)
