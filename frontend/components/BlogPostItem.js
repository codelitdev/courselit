import React from 'react'
import PropTypes from 'prop-types'
import Link from 'next/link'
import TextEditor from './TextEditor.js'
import { formattedLocaleDate } from '../lib/utils.js'

const BlogPostItem = (props) => (
  <article>
    <h1 className="title">{ props.title }</h1>
    <TextEditor
      initialContentState={ TextEditor.hydrate(props.description) }
      readOnly={ true }/>
    <p>Updated on { formattedLocaleDate(props.updated) } by { props.creatorName }</p>
    <Link href={`/posts/${props.id}/${props.slug}`}>
      <a>Visit post</a>
    </Link>
    <style jsx>{`
    `}</style>
  </article>
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
