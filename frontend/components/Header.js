/**
 * This component renders the header of the website
 */

import React from 'react'
import Branding from './Branding.js'
import SessionButton from './SessionButton.js'
import { Grid } from '@material-ui/core'

export default function Header (props) {
  return (
    <Grid container direction='row' alignItems='center'>
      <Grid item xs={10}>
        <Branding />
      </Grid>
      <Grid item xs={2}>
        <SessionButton />
      </Grid>
    </Grid>
  )
}
