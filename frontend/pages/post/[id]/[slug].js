import { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import MasterLayout from '../../../components/Masterlayout.js'
import { BACKEND } from '../../../config/constants.js'
// import { networkAction } from '../../../redux/actions.js'
import TextEditor from '../../../components/TextEditor'
import {
  queryGraphQL,
  formattedLocaleDate
} from '../../../lib/utils.js'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { Grid, Typography, makeStyles } from '@material-ui/core'

const useStyles = makeStyles({
  article: {
    marginTop: '3.2em'
  },
  creatoravatarcontainer: {
    display: 'flex',
    alignItems: 'center'
  },
  creatorcard: {
    paddingTop: '0.4em',
    paddingBottom: '2.4em'
  },
  creatoravatar: {
    borderRadius: '1.5em',
    width: '3em',
    marginRight: '1em'
  },
  updatedtime: {

  }
})

// const router = useRouter()

const Posts = (props) => {
  const classes = useStyles()

  return (
    <MasterLayout>
      {
        props.post &&
        <article className={classes.article}>
          <Typography variant="h3">
            {props.post.title}
          </Typography>
          <img src={ props.post.featuredImage }/>
          <Grid container className={classes.creatorcard}>
            <Grid item className={classes.creatoravatarcontainer}>
              <img src='/static/logo.jpg' className={classes.creatoravatar}></img>
            </Grid>
            <Grid item>
              <Typography variant='overline' component='p'>
                <Link href='/creator/[id]' as={`/creator/${props.post.creatorId}`}>
                  <a>
                    { props.post.creatorName }
                  </a>
                </Link>
              </Typography>
              <Typography variant='overline' className={classes.updatedtime}>
                { formattedLocaleDate(props.post.updated) }
              </Typography>
            </Grid>
          </Grid>
          <TextEditor
            initialContentState={ TextEditor.hydrate(props.post.description) }
            readOnly={ true }/>
        </article>
      }
    </MasterLayout>
  )
}

Posts.getInitialProps = async ({ query }) => {
    const graphQuery = `
        query {
        post: getCourse(id: "${query.id}") {
            title,
            description,
            featuredImage,
            updated,
            creatorName,
            creatorId
        }
        }
    `
    const response = await queryGraphQL(
        `${BACKEND}/graph`,
        graphQuery
    )
    return { post: response.post }
}

// Posts.propTypes = {
//   post: PropTypes.shape({
//     title: PropTypes.string.isRequired,
//     description: PropTypes.string.isRequired,
//     featuredImage: PropTypes.string.isRequired,
//     updated: PropTypes.string.isRequired,
//     creatorName: PropTypes.string.isRequired
//   })
// }

export default connect()(Posts)
