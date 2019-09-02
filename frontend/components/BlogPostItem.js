import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import TextEditor from './TextEditor.js'
// import { formattedLocaleDate } from '../lib/utils.js'
import { URL_EXTENTION_POSTS } from '../config/constants.js'

const BlogPostItem = (props) => (
  <Link href={`/${URL_EXTENTION_POSTS}/${props.id}/${props.slug}`}>
    <article>
      <h4 className="title">{ props.title }</h4>
      <TextEditor
        initialContentState={ TextEditor.hydrate(props.description) }
        readOnly={ true }/>
      {/* <p>Updated on { formattedLocaleDate(props.updated) } by { props.creatorName }</p> */}
      <style jsx>{`
        article {
          padding: 10px 2px;
          margin-bottom: 0.4em;
        }

        article:hover {
          border: .1em solid blue;
          cursor: pointer;
        }

        article + article {
        }

        .title {
          font-weight: bold;
          margin-bottom: 0.8em;
        }

      `}</style>
    </article>
  </Link>
)

BlogPostItem.propTypes = {
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string.isRequired,
  updated: PropTypes.string.isRequired,
  creatorName: PropTypes.string.isRequired,
  slug: PropTypes.string.isRequired
}

export default BlogPostItem
