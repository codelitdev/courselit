import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
// import { formattedLocaleDate } from '../lib/utils.js'
import { URL_EXTENTION_POSTS } from '../config/constants.js'
import { Grid, Typography } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import Img from './Img.js'

const useStyles = makeStyles({
  featuredimagecontainer: {
    display: 'flex',
    marginRight: 20
  },
  bloglink: {
    textDecoration: 'none',
    display: 'block',
    marginBottom: 20,
    '&:hover': {
      background: '#eee'
    }
  }
})

const BlogPostItem = (props) => {
  const classes = useStyles()

  return (
    <Link
      href={`/${URL_EXTENTION_POSTS}/[id]/[slug]`}
      as={`/${URL_EXTENTION_POSTS}/${props.id}/${props.slug}`}>
      <a className={classes.bloglink}>
        <article>
          <Grid container>
            {props.featuredImage &&
              <Grid item className={classes.featuredimagecontainer}>
                <Img src={props.featuredImage} isThumbnail={true} />
              </Grid>
            }
            <Grid item>
              <Grid>
                <Grid item>
                  <Typography variant='h6' className="title">{ props.title }</Typography>
                </Grid>
                <Grid item>
                  <Typography variant='body2'>{props.description}</Typography>
                </Grid>
              </Grid>
            </Grid>
          </Grid>
        </article>
      </a>
    </Link>
  )
}

BlogPostItem.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired,
  featuredImage: PropTypes.string
}

export default BlogPostItem
