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
import { Grid, Button } from '@material-ui/core'
import {
  HEADER_BLOG_POSTS_SECTION,
  HEADER_SOCIAL_SECTION,
  BTN_LOAD_MORE
} from '../config/strings.js'

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
      <Grid container direction='row'>
        <Grid item xs={10}>
          <section className='posts'>
            <h1>{HEADER_BLOG_POSTS_SECTION}</h1>
            { posts.map((x, index) => <BlogPostItem key={index} {...x}/>) }
            { posts.length > 0 && <Button onClick={getBlogPosts}>{BTN_LOAD_MORE}</Button> }
          </section>
        </Grid>
        <Grid item xs={2}>
          <aside>
            <h1>{HEADER_SOCIAL_SECTION}</h1>
          </aside>
        </Grid>
      </Grid>
    </MasterLayout>
  )
}

Index.getInitialProps = async () => {
  let postsPaginationOffset = 1
  const response = await queryGraphQL(
    `${BACKEND}/graph`,
    getBlogPostQuery(postsPaginationOffset)
  )
  console.log(response)
  return { posts: response.posts, postsOffset: ++postsPaginationOffset }
}

const mapStateToProps = state => ({
  auth: state.auth
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(mapStateToProps, mapDispatchToProps)(Index)
