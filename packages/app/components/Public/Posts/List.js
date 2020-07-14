import React, { useState, useEffect } from 'react'
import PropTypes from 'prop-types'
import { connect } from "react-redux"
import { networkAction } from '../../../redux/actions'
import FetchBuilder from '../../../lib/fetch'
import { BACKEND } from '../../../config/constants'
import { Grid, Typography, Button } from '@material-ui/core'
import { HEADER_BLOG_POSTS_SECTION, BTN_LOAD_MORE } from '../../../config/strings'
import ListItem from './ListItem'

const List = props => {
  console.log(props);
    const [posts, setPosts] = useState([])
    const [postsOffset, setPostsOffset] = useState(1)

    useEffect(() => {
        console.log(`Called for ${postsOffset}`);
        getPosts();
    }, [postsOffset])

    const getPosts = async () => {
        const query = `
        query {
            posts: getPosts(offset: ${postsOffset}) {
                id,
                title,
                description,
                updated,
                creatorName,
                slug,
                featuredImage
            }
        }
        `

        try {
            props.dispatch && props.dispatch(networkAction(true));
            const fetch = new FetchBuilder()
                .setUrl(`${BACKEND}/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetch.exec();
            console.log(response);
            if (response.posts) {
                setPosts([...posts, ...response.posts]);
            }
        } finally {
          props.dispatch && props.dispatch(networkAction(false));
        }
    };

    return posts.length > 0 ? (
        <Grid item xs={12}>
          <section>
            <Typography variant="h4">
              {HEADER_BLOG_POSTS_SECTION}
            </Typography>
            {posts.map((x, index) => (
              <ListItem key={index} {...x} />
            ))}
            {posts.length > 0 && (
              <Button onClick={() => setPostsOffset(postsOffset + 1)}>
                {BTN_LOAD_MORE}
              </Button>
            )}
          </section>
        </Grid>
    ) : <></>
}

List.propTypes = {
    dispatch: PropTypes.func.isRequired
}

const mapStateToProps = state => ({})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(List);