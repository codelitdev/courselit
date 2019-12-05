import { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import MasterLayout from '../components/Masterlayout.js'
import {
  networkAction
} from '../redux/actions.js'
import {
  queryGraphQL,
  queryGraphQLWithUIEffects
} from '../lib/utils.js'
import {
  BACKEND
} from '../config/constants.js'
import BlogPostItem from '../components/BlogPostItem.js'
import { Grid, Button, Typography } from '@material-ui/core'
import {
  HEADER_BLOG_POSTS_SECTION,
  BTN_LOAD_MORE
} from '../config/strings.js'
import Hero from '../components/Hero.js'
import { makeStyles } from '@material-ui/styles'
import ContainedBodyLayout from '../components/ContainedBodyLayout.js'
import About from '../components/About.js'

const useStyles = makeStyles(theme => ({
  root: {
    marginTop: 10
  },
  body: {
    marginTop: '1.8em'
  }
}))

const getBlogPostQuery = (postsPaginationOffset) =>
  `
    query {
      posts: getPosts(offset: ${postsPaginationOffset}) {
        id,
        title,
        description,
        updated,
        creatorName,
        slug,
        featuredImage
      }
    }
  `

const Index = (props) => {
  const [posts, setPosts] = useState([...props.posts])
  const [postsOffset, setPostsOffset] = useState(props.postsOffset)
  const getDataUnauth = queryGraphQLWithUIEffects(
    `${BACKEND}/graph`,
    props.dispatch,
    networkAction
  )
  const classes = useStyles()

  const getBlogPosts = async () => {
    const response = await getDataUnauth(getBlogPostQuery(postsOffset))
    if (response.posts) {
      setPosts([...posts, ...response.posts])
      setPostsOffset(postsOffset + 1)
    }
  }

  useEffect(() => {
    getBlogPosts()
  }, [])

  return (
    <MasterLayout>
      <Grid container direction='column'>
        <Grid item>
          <div className={classes.offset}></div>
        </Grid>
        <Grid item>
          <Hero featuredCourses={props.featuredCourses}/>
        </Grid>
        <Grid item className={classes.body}>
          <ContainedBodyLayout>
            <Grid container direction='row' spacing={2}>
              <Grid item xs={12} sm={9}>
                <section className='posts'>
                  <Typography variant='h4'>
                    {HEADER_BLOG_POSTS_SECTION}
                  </Typography>
                  { posts.map((x, index) => <BlogPostItem key={index} {...x}/>) }
                  { posts.length > 0 && <Button onClick={getBlogPosts}>{BTN_LOAD_MORE}</Button> }
                </section>
              </Grid>
              <Grid item xs={12} sm={3}>
                <aside>
                  <About />
                </aside>
              </Grid>
            </Grid>
          </ContainedBodyLayout>
        </Grid>
      </Grid>
    </MasterLayout>
  )
}

Index.getInitialProps = async () => {
  let postsOffset = 1
  const postsResponse = await queryGraphQL(
    `${BACKEND}/graph`,
    getBlogPostQuery(postsOffset++)
  )

  const featuredCourses = await getFeaturedCourses()

  return { posts: postsResponse.posts, postsOffset, featuredCourses }
}

const getFeaturedCourses = async () => {
  const response = await queryGraphQL(
    `${BACKEND}/graph`,
    `
    query {
      featuredCourses: getPublicCourses(offset: 1, onlyShowFeatured: true) {
        id,
        title,
        cost,
        featuredImage
      }
    }
    `
  )

  return response.featuredCourses
}

const mapStateToProps = state => ({
  auth: state.auth
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(mapStateToProps, mapDispatchToProps)(Index)
