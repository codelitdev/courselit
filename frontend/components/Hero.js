import React, { useState } from 'react'
import { Grid, IconButton, Typography, Button } from '@material-ui/core'
import PropTypes from 'prop-types'
import {
  featuredCourse,
  siteInfoProps
} from '../types.js'
import { makeStyles } from '@material-ui/styles'
import { connect } from 'react-redux'
import {
  KeyboardArrowLeft,
  KeyboardArrowRight
} from '@material-ui/icons'

import { formulateMediaUrl } from '../lib/utils'
import { MEDIA_BACKEND } from '../config/constants'
import { FREE_COST } from '../config/strings.js'

const useStyles = (backgroundImageUrl) => makeStyles(theme => ({
  container: {
    background: `url('${formulateMediaUrl(MEDIA_BACKEND, backgroundImageUrl, false)}') no-repeat center center`,
    backgroundSize: 'cover'
  },
  contentContainer: {
    padding: '12em 2em',
    [theme.breakpoints.down('sm')]: {
      padding: '7em 0em'
    }
  },
  title: {
    marginBottom: '2em',
    margin: '0.8em 0em',
    textAlign: 'center'
  }
}))

const Hero = (props) => {
  const [offset, setOffset] = useState(0)
  const { featuredCourses } = props
  console.log(featuredCourses)
  const item = featuredCourses[offset]
  if (!item) return <></>
  
  const classes = useStyles(item.featuredImage)()
  const cost = item.cost > 0 ? `${props.siteInfo.currencyUnit}${item.cost}` : FREE_COST

  const showNextItem = () => setOffset(offset + 1 === featuredCourses.length ? offset : offset + 1)
  const showPreviousItem = () => setOffset(offset - 1 < 0 ? 0 : offset - 1)

  return (
    <Grid container direction='row'
      justify='space-between' alignItems='center' className={classes.container}>
      <Grid item container direction='row' justify='flex-start' xs={1}>
        <Grid item>
          <IconButton aria-label="previous" onClick={showPreviousItem}>
            <KeyboardArrowLeft />
          </IconButton>
        </Grid>
      </Grid>
      <Grid item xs={10}>
        <Grid container direction='column'
          justify='center' alignItems='center' className={classes.contentContainer}>
          <Grid item className={classes.title} >
            <Typography variant='h2'>
              {item.title}
            </Typography>
          </Grid>
          <Grid item>
            <Typography variant='h4'>
              <Button variant='contained' color='primary'>
                  Enroll for {cost}
              </Button>
            </Typography>
          </Grid>
        </Grid>
      </Grid>
      <Grid item container direction='row' justify='flex-end' xs={1}>
        <Grid item>
          <IconButton aria-label="previous" onClick={showNextItem}>
            <KeyboardArrowRight />
          </IconButton>
        </Grid>
      </Grid>
    </Grid>
  )
}

Hero.propTypes = {
  featuredCourses: PropTypes.arrayOf(featuredCourse),
  siteInfo: siteInfoProps
}

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
})

export default connect(mapStateToProps)(Hero)
