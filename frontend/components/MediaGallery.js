import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import {
  Grid,
  TextField,
  GridList,
  GridListTile,
  GridListTileBar,
  IconButton,
  ListSubheader,
  Button
} from "@material-ui/core";
import { makeStyles } from "@material-ui/styles";
import { authProps } from "../types.js";
import {
  MEDIA_SEARCH_INPUT_PLACEHOLDER,
  LOAD_MORE_TEXT,
  BUTTON_SEARCH,
  HEADER_YOUR_MEDIA
} from "../config/strings.js";
import AppLoader from "./AppLoader.js";
import FetchBuilder from "../lib/fetch.js";
import { InfoOutlined } from "@material-ui/icons";
import { networkAction } from "../redux/actions.js";
import { BACKEND } from "../config/constants.js";

const useStyles = makeStyles(theme => ({
  searchField: {
    flexGrow: 1,
    marginRight: theme.spacing(2)
  },
  cardHeader: {
    marginBottom: theme.spacing(2)
  },
  mediaGrid: {
    paddingBottom: theme.spacing(2)
  },
  mediaGridHeader: {
    height: "auto"
  },
  gridListItemIcon: {
    color: "#fff"
  }
}));

const MediaGallery = props => {
  const defaultUserMedia = [];
  const defaultMediaOffset = 1;
  const [mediaOffset, setMediaOffset] = useState(defaultMediaOffset);
  const [searchText, setSearchText] = useState("");
  const [userMedia, setUserMedia] = useState(defaultUserMedia);
  const classes = useStyles();

  useEffect(() => {
    loadMedia();
  }, []);

  const loadMedia = async () => {
    const query = `
    query {
      media: getCreatorMedia(offset: ${mediaOffset}, searchText: "${searchText}") {
        id,
        title,
        mimeType,
      }
    }
    `;
    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build();
    try {
      props.dispatch(networkAction(true));
      // const response = await queryGraphQL(
      //   `${BACKEND}/graph`,
      //   query,
      //   props.auth.token
      // )
      const response = await fetch.exec();

      // console.log(response)
      if (response.media && response.media.length > 0) {
        setUserMedia([...userMedia, ...response.media]);
        setMediaOffset(mediaOffset + 1);
      }
    } catch (err) {
      // setUserError(err.message)
    } finally {
      props.dispatch(networkAction(false));
    }
  };

  const searchMedia = e => {
    e.preventDefault();
    reset();

    loadMedia();
  };

  const reset = () => {
    setUserMedia(defaultUserMedia);
    setMediaOffset(defaultMediaOffset);
  };

  const onSearchTextChanged = e => setSearchText(e.target.value);

  const onMediaSelected = mediaId =>
    props.onMediaSelected && props.onMediaSelected(mediaId);

  return (
    <>
      <form onSubmit={searchMedia}>
        <Grid container direction="row" alignItems="center">
          <Grid item className={classes.searchField}>
            <TextField
              value={searchText}
              variant="outlined"
              label=""
              fullWidth
              margin="normal"
              placeholder={MEDIA_SEARCH_INPUT_PLACEHOLDER}
              onChange={onSearchTextChanged}
            />
          </Grid>
          <Grid item>
            <Button
              type="submit"
              variant={searchText.trim().length !== 0 ? "contained" : "text"}
              disabled={searchText.trim().length === 0}
            >
              {BUTTON_SEARCH}
            </Button>
          </Grid>
        </Grid>
      </form>
      <GridList cols={3} className={classes.mediaGrid}>
        <GridListTile cols={3} key="Subheader" style={{ height: "auto" }}>
          <ListSubheader component="div">{HEADER_YOUR_MEDIA}</ListSubheader>
        </GridListTile>
        {userMedia.map(item => (
          <GridListTile
            key={item.id}
            cols={1}
            onClick={() => onMediaSelected(item.id)}
          >
            <img src={`${BACKEND}/media/${item.id}?thumb=1`} />
            <GridListTileBar
              title={item.title}
              subtitle={item.mimeType}
              actionIcon={
                <IconButton className={classes.gridListItemIcon}>
                  <InfoOutlined />
                </IconButton>
              }
            />
          </GridListTile>
        ))}
      </GridList>
      {props.networkAction && <AppLoader />}
      <Button onClick={loadMedia}>{LOAD_MORE_TEXT}</Button>
    </>
  );
};

MediaGallery.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  networkAction: PropTypes.bool.isRequired,
  onMediaSelected: PropTypes.func
};

const mapStateToProps = state => ({
  auth: state.auth,
  networkAction: state.networkAction
});

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
});

export default connect(mapStateToProps, mapDispatchToProps)(MediaGallery);
