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

// const router = useRouter()

const Posts = (props) => {
  return (
    <MasterLayout>
      {
        props.post &&
        <article>
          <h1>{ props.post.title }</h1>
          <p>Updated on { formattedLocaleDate(props.post.updated) } by { props.post.creatorName }</p>
          <img src={ props.post.featuredImage }/>
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
            creatorName
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
