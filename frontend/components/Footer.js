import React from 'react'
import { connect } from 'react-redux'
import { siteInfoProps } from '../types'
import { Grid, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import ContainedBodyLayout from './ContainedBodyLayout'
import {
  GENERIC_COPYRIGHT_TEXT
} from '../config/strings.js'

const useStyles = makeStyles(theme => ({
  container: {
    background: theme.palette.secondary.dark,
    padding: '1.2em 0em 1.8em 0em'
  }
}))

const Footer = (props) => {
  const classes = useStyles()

  return (
    <Grid className={classes.container}>
      <ContainedBodyLayout>
        <Grid container direction='row' justify='space-between'>
          <Grid item>
            <Typography variant='h5'>
              {props.siteInfo.title}
            </Typography>
            <Typography variant='subtitle2'>
              {props.siteInfo.subtitle}
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant='body2'>
              {props.siteInfo.copyrightText || GENERIC_COPYRIGHT_TEXT}
            </Typography>
          </Grid>
        </Grid>
      </ContainedBodyLayout>
    </Grid>
  )
}

Footer.propTypes = {
  siteInfo: siteInfoProps
}

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
})

export default connect(mapStateToProps)(Footer)
