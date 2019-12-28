import { connect } from 'react-redux'
import MasterLayout from '../../../components/Masterlayout.js'
import { BACKEND, FRONTEND, MEDIA_BACKEND } from '../../../config/constants.js'
import {
  queryGraphQL,
  formulateMediaUrl,
  formulateCourseUrl,
  getPostDescriptionSnippet
} from '../../../lib/utils.js'
import { makeStyles } from '@material-ui/core'
import Head from 'next/head'
import ContainedBodyLayout from '../../../components/ContainedBodyLayout.js'
import Article from '../../../components/Article.js'

const useStyles = makeStyles({
  articleMarginAdjust: {
    marginTop: '3.2em'
  }
})

// const useStyles = (featuredImage) => makeStyles({
//   article: {
//     marginTop: '3.2em'
//   },
//   creatoravatarcontainer: {
//     display: 'flex',
//     alignItems: 'center'
//   },
//   creatorcard: {
//     paddingTop: '0.8em',
//     paddingBottom: '2.4em'
//   },
//   creatoravatar: {
//     borderRadius: '1.5em',
//     width: '3em',
//     marginRight: '1em'
//   },
//   featuredimagecontainer: {
//     width: '100%',
//     height: 240,
//     overflow: 'hidden',
//     marginBottom: '1.8em',
//     background: `url('${formulateMediaUrl(BACKEND, featuredImage)}')`,
//     backgroundPosition: 'center'
//   }
// })

// const getPostDescriptionSnippet = (rawContentState) => {
//   const firstSentence = TextEditor
//     .hydrate(rawContentState)
//     .getCurrentContent()
//     .getPlainText()
//     .split('.')[0]

//   return firstSentence ? firstSentence + '.' : firstSentence
// }

const Post = (props) => {
  const classes = useStyles()
  const articleOptions = {
    showAttribution: false
  }

  return (
    <MasterLayout>
      {
        props.post &&
        <>
          <Head>
            <title>{props.post.title}</title>
            <meta property="og:url" content={formulateCourseUrl(props.post, FRONTEND)} />
            <meta property="og:type" content='article' />
            <meta property="og:title" content={props.post.title} />
            <meta property="og:description" content={getPostDescriptionSnippet(props.post.description)} />
            <meta property="og:author" content={props.post.creatorName} />
            {props.post.featuredImage &&
              <meta property="og:image" content={formulateMediaUrl(MEDIA_BACKEND, props.post.featuredImage)} />}
          </Head>
          <ContainedBodyLayout>
            <div className={classes.articleMarginAdjust}/>
            <Article course={props.post} options={articleOptions}/>
          </ContainedBodyLayout>
        </>
      }
    </MasterLayout>
  )
}

Post.getInitialProps = async ({ query }) => {
  const graphQuery = `
  query {
    post: getCourse(id: "${query.id}") {
        id,
        title,
        description,
        featuredImage,
        updated,
        creatorName,
        creatorId,
        slug,
        isBlog
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

export default connect()(Post)
