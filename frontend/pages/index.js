import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import MasterLayout from './masterlayout.js'
import {
  networkAction
} from '../redux/actions.js'
import {
  getDataCreator
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
  const getDataUnauth = getDataCreator(
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
      <div>
        <section className='post'>
          <h1>Latest Posts</h1>
          { posts.map((x, index) => <BlogPostItem key={index} {...x}/>) }
          { posts.length > 0 && <button onClick={getBlogPosts}>Load more</button> }
        </section>
      </div>
    </MasterLayout>
  )
}

export default connect()(Index)
