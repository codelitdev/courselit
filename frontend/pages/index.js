import React, { useState, useEffect } from 'react'
import { connect } from 'react-redux'
// import PropTypes from 'prop-types'
import Link from 'next/link'
import MasterLayout from './masterlayout.js'
// import {
//   latestPostsProps
// } from '../types.js'
import {
  networkAction
} from '../redux/actions.js'
import {
  getDataCreator
} from '../lib/utils.js'
import {
  BACKEND
} from '../config/constants.js'

let postsPaginationOffset = 1

const Index = (props) => {
  const [posts, setPosts] = useState([])
  const getDataUnauth = getDataCreator(
    `${BACKEND}/graph`,
    props.dispatch,
    networkAction
  )

  const getPosts = async () => {
    const query = `
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
    getDataUnauth(query, (response) => {
      if (response.posts) {
        setPosts([...posts, ...response.posts])
        postsPaginationOffset += 1
      }
    })
  }

  // const getPosts = async () => {
  //   try {
  //     props.dispatch(networkAction(false))
  //     let response = await queryGraphQL(
  //       `${BACKEND}/graph`,
  //       `
  //       query {
  //         posts: getPosts(offset: ${postsPaginationOffset}) {
  //           id,
  //           title,
  //           description,
  //           updated,
  //           creatorName,
  //           slug
  //         }
  //       }
  //       `)

  //     if (response.posts) {
  //       setPosts([...posts, ...response.posts])
  //       postsPaginationOffset += 1
  //     }
  //   } catch (err) {
  //     // do nothing
  //   } finally {
  //     props.dispatch(networkAction(false))
  //   }
  // }

  useEffect(() => {
    getPosts()
  }, [])

  return (<MasterLayout>
    <div>
      <div className='post'>
        <p>Latest Posts</p>
        {(posts.map(
          (x, index) => <div key={ index }>
            <p>{x.title}</p>
            <p>{x.description}</p>
            <p>Updated on {(new Date(Number(x.updated))).toString()} by {x.creatorName}</p>
            <Link href={`/posts/${x.id}/${x.slug}`}>
              <a>Visit post</a>
            </Link>
          </div>
        ))}
        { posts.length > 0 &&
          <button onClick={getPosts}>Load more</button>}
      </div>
    </div>
  </MasterLayout>)
}

// Index.getInitialProps = async ({ store, isServer, pathname, query }) => {
//   return {}
// }

// Index.propTypes = {
//   posts: PropTypes.arrayOf(latestPostsProps),
//   dispatch: PropTypes.func.isRequired
// }

// const mapStateToProps = (state) => state
// const mapDispatchToProps = (dispatch) => (dispatch)
export default connect(
  // mapStateToProps
  // mapDispatchToProps
)(Index)
