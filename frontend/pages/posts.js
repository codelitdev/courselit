import { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import MasterLayout from './masterlayout.js'
import PropTypes from 'prop-types'
import {
  getDataCreator
} from '../lib/utils.js'
import {
  BACKEND
} from '../config/constants.js'
import {
  networkAction
} from '../redux/actions.js'

const Posts = (props) => {
  const [post, setPost] = useState({})
  const getDataUnauth = getDataCreator(
    `${BACKEND}/graph`,
    props.dispatch,
    networkAction
  )

  const getPost = async () => {
    const query = `
    query {
      post: getCourse(id: "${props.courseId}") {
        title,
        description,
        featuredImage,
        updated,
        creatorName
      }
    }
    `
    getDataUnauth(query, (response) => {
      if (response.post) {
        setPost(response.post)
      }
    })
  }

  useEffect(() => {
    getPost()
  }, [])

  return (<MasterLayout>
    <div>
      <p>{post.title}</p>
      <p>Updated on {(new Date(Number(post.updated))).toString()} by {post.creatorName}</p>
      <img src={post.featuredImage}/>
      <p>{post.description}</p>
    </div>
  </MasterLayout>)
}

Posts.getInitialProps = ({ query }) => {
  return query
}

Posts.propTypes = {
  post: PropTypes.shape({
    title: PropTypes.string.isRequired,
    description: PropTypes.string.isRequired,
    featuredImage: PropTypes.string.isRequired,
    updated: PropTypes.string.isRequired,
    creatorName: PropTypes.string.isRequired
  })
}

export default connect()(Posts)
