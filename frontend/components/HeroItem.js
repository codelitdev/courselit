import React from 'react'
import { featuredCourse, siteInfoProps } from '../types'
import { Grid, Typography, Button } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import { formulateMediaUrl } from '../lib/utils'
import { MEDIA_BACKEND } from '../config/constants'
import { connect } from 'react-redux'

const useStyles = (backgroundImageUrl) => makeStyles({
  container: {
    padding: '12em 0em',
    background: `url('${formulateMediaUrl(MEDIA_BACKEND, backgroundImageUrl, false)}') no-repeat center center fixed`,
    backgroundSize: 'cover'
  },
  title: {
    marginBottom: '2em'
  }
})

const HeroItem = (props) => {
  const classes = useStyles(props.item.featuredImage)()

  return (
    <Grid item container direction='column' justify='center' alignItems='center' className={classes.container}>
      <Grid item className={classes.title}>
        <Typography variant='h2'>
          {props.item.title}
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant='h4'>
          <Button variant='contained' color='primary'>
                        Enroll for {props.siteInfo.currencyUnit}{props.item.cost}
          </Button>
        </Typography>
      </Grid>
    </Grid>
  )
}

HeroItem.propTypes = {
  item: featuredCourse,
  siteInfo: siteInfoProps
}

const mapStateToProps = state => ({
  siteInfo: state.siteinfo
})

export default connect(mapStateToProps)(HeroItem)
