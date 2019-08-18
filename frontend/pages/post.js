import { useState, useEffect } from 'react'
import { connect } from 'react-redux'
import MasterLayout from './masterlayout.js'
import PropTypes from 'prop-types'
import { queryGraphQLWithUIEffects, formattedLocaleDate } from '../lib/utils.js'
import { BACKEND } from '../config/constants.js'
import { networkAction } from '../redux/actions.js'
import TextEditor from '../components/TextEditor.js'

const Posts = (props) => {
  const [post, setPost] = useState({})
  const getDataUnauth = queryGraphQLWithUIEffects(
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
    await getDataUnauth(
      query,
      (response) => response.post && setPost(response.post)
    )
  }

  useEffect(() => {
    getPost()
  }, [])

  return (
    <MasterLayout>
      {
        post.title &&
        <article>
          <h1>{ post.title }</h1>
          <p>Updated on { formattedLocaleDate(post.updated) } by { post.creatorName }</p>
          <img src={ post.featuredImage }/>
          <TextEditor
            initialContentState={ TextEditor.hydrate(post.description) }
            readOnly={ true }/>
        </article>
      }
    </MasterLayout>
  )
}

Posts.getInitialProps = ({ query }) => query

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
