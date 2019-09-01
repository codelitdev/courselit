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
      <section className='post'>
        <h1>Latest Posts</h1>
        { posts.map((x, index) => <BlogPostItem key={index} {...x}/>) }
        { posts.length > 0 && <button onClick={getBlogPosts}>Load more</button> }
      </section>
      <style jsx>{`
        section {
          background: red;
        }
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
