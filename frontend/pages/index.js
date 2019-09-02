import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import MasterLayout from '../components/Masterlayout.js'
import {
  networkAction
} from '../redux/actions.js'
import {
  queryGraphQLWithUIEffects
} from '../lib/utils.js'
import {
  BACKEND
} from '../config/constants.js'
import BlogPostItem from '../components/BlogPostItem.js'
import Button from '@material-ui/core/Button'

let postsPaginationOffset = 1

const getBlogPostQuery = (postsPaginationOffset) => {
  return `
    query {
      posts: getPosts(offset: ${postsPaginationOffset}) {
        id,
        title,
        description,
        updated,
        creatorName,
        slug
      }
    }
  `
}

const Index = (props) => {
  const [posts, setPosts] = useState([])
  const getDataUnauth = queryGraphQLWithUIEffects(
    `${BACKEND}/graph`,
    props.dispatch,
    networkAction
  )

  const getBlogPosts = async () => {
    getDataUnauth(
      getBlogPostQuery(postsPaginationOffset),
      (response) => {
        if (response.posts) {
          setPosts([...posts, ...response.posts])
          postsPaginationOffset += 1
        }
      })
  }

  useEffect(() => {
    getBlogPosts()
  }, [])

  return (
    <MasterLayout>
      <div className="content">
        <section className='posts'>
          <h1>Latest Posts</h1>
          { posts.map((x, index) => <BlogPostItem key={index} {...x}/>) }
          { posts.length > 0 && <Button onClick={getBlogPosts}>Load more</Button> }
        </section>
        <aside>
          <h1>Social Corner</h1>
        </aside>
      </div>
      <style jsx>{`
        // .content {
        //   display: flex;
        //   margin-top: 2em;
        // }
        // section {
        //   display: flex;
        //   flex: 8;
        //   flex-direction: column;
        // }
        // aside {
        //   display: flex;
        //   flex: 2;
        // }
        // section h1 {
        //   margin-bottom: 0.8em;
        // }
      `}</style>
    </MasterLayout>
  )
}

const mapStateToProps = state => ({
  auth: state.auth
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(mapStateToProps, mapDispatchToProps)(Index)
