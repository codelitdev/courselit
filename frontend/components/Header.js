/**
 * This component renders the header of the website
 */

import React from 'react'
import PropTypes from 'prop-types'
import Branding from './Branding.js'
import SessionButton from './SessionButton.js'
import { Grid } from '@material-ui/core'

export default function Header (props) {
  return (
    <Grid container direction='row'>
      <Grid item xs={10}>
        <Branding backend={props.backend}/>
      </Grid>
      <Grid item xs={2}>
        <SessionButton />
      </Grid>
    </Grid>
  )
}

Header.propTypes = {
  backend: PropTypes.string
}
