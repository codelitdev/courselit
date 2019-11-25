import React from 'react'
import { Grid } from '@material-ui/core'
import PropTypes from 'prop-types'
import { featuredCourse } from '../types.js'
import HeroItem from './HeroItem.js'

const Hero = (props) => {
  return (
    <Grid container>
      {props.featuredCourses.map(course => <HeroItem item={course} key={course.id}/>)}
    </Grid>
  )
}

Hero.propTypes = {
  featuredCourses: PropTypes.arrayOf(featuredCourse)
}

export default Hero
