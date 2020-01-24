/**
 * Component for managing all media across the app
 */
import React, { useState, createRef, useEffect } from 'react'
import { connect } from 'react-redux'
import fetch from 'isomorphic-unfetch'
import PropTypes from 'prop-types'
import {
  MEDIA_UPLOAD_BUTTON_TEXT,
  ERR_MEDIA_UPLOAD_TITLE_TEXT,
  MEDIA_SEARCH_INPUT_PLACEHOLDER,
  LOAD_MORE_TEXT,
  MEDIA_MANAGER_PAGE_HEADING,
  BUTTON_SEARCH,
  MEDIA_MANAGER_DIALOG_TITLE,
  BUTTON_ADD_FILE,
  FILE_UPLOAD_SUCCESS,
  HEADER_YOUR_MEDIA
} from '../config/strings.js'
import { BACKEND } from '../config/constants.js'
import { authProps } from '../types.js'
import { networkAction, setAppError } from '../redux/actions.js'
import {
  TextField,
  Button,
  Grid,
  Typography,
  Fab,
  CardActions,
  Card,
  CardContent,
  GridList,
  GridListTile,
  GridListTileBar,
  IconButton,
  ListSubheader
} from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import { Add, Done, InfoOutlined } from '@material-ui/icons'
import AppError from '../models/app-error.js'
import AppLoader from './AppLoader.js'
import FetchBuilder from '../lib/fetch.js'

const useStyles = makeStyles(theme => ({
  header: {
    marginBottom: theme.spacing(1)
  },
  searchField: {
    flexGrow: 1,
    marginRight: theme.spacing(2)
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(4),
    right: theme.spacing(4)
  },
  fileUploadInput: {
    display: 'none'
  },
  cardHeader: {
    marginBottom: theme.spacing(2)
  },
  mediaGrid: {
    paddingBottom: theme.spacing(2)
  },
  mediaGridHeader: {
    height: 'auto'
  },
  gridListItemIcon: {
    color: '#fff'
  }
}))

const MediaManager = (props) => {
  const defaults = {
    uploadData: {
      title: '',
      altText: '',
      uploading: false
    },
    uploadFormVisibility:
      typeof props.mediaAdditionAllowed !== 'undefined'
        ? props.mediaAdditionAllowed : true,
    searchText: '',
    userError: '',
    userMedia: [],
    selectedMedia: null
  }
  const [uploadData, setUploadData] = useState(defaults.uploadData)
  const [searchText, setSearchText] = useState(defaults.searchText)
  const [userError, setUserError] = useState(defaults.userError)
  // contains information about user's already uploaded media
  const [userMedia, setUserMedia] = useState(defaults.userMedia)
  const [selectedMedia] = useState(defaults.selectedMedia)
  const fileInput = createRef()
  const [mediaOffset, setMediaOffset] = useState(1)
  const classes = useStyles()
  const [uploadFormVisible, setUploadFormVisible] = useState(false)

  useEffect(() => {
    loadMedia()
  }, [])

  const onUploadDataChanged = (e) => setUploadData(
    Object.assign({}, uploadData, {
      [e.target.name]: e.target.value
    })
  )

  const onUpload = async (e) => {
    e.preventDefault()

    // clear errors from previous submissions
    setUserError('')

    // validate data
    if (!uploadData.title || fileInput.current.files.length === 0) {
      setUserError(ERR_MEDIA_UPLOAD_TITLE_TEXT)
      return
    }

    const fD = new window.FormData()
    fD.append('title', uploadData.title)
    fD.append('altText', uploadData.altText)
    fD.append('file', fileInput.current.files[0])

    setUploadData(Object.assign({}, uploadData, {
      uploading: true
    }))

    try {
      let res = await fetch(`${BACKEND}/media`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${props.auth.token}`
        },
        body: fD
      })
      res = await res.json()

      if (res.media) {
        setUploadData(defaults.uploadData)
        setUserMedia([res.media, ...userMedia])
        props.dispatch(
          setAppError(new AppError(FILE_UPLOAD_SUCCESS))
        )
        setUploadFormVisible(false)
      }
    } catch (err) {
      setUserError(err.message)
    }
  }

  // const toggleUploadFormVisibility = () =>
  //   setUploadFormVisibility(!uploadFormVisibility)

  const onSearchTextChanged = (e) =>
    setSearchText(e.target.value)

  // const cancelMediaUpload = () => {
  //   setUploadData(defaults.uploadData)
  //   toggleUploadFormVisibility()
  // }

  const loadMedia = async () => {
    const query = `
    query {
      media: getCreatorMedia(offset: ${mediaOffset}, searchText: "${searchText}") {
        id,
        title,
        mimeType,
      }
    }
    `
    const fetch = new FetchBuilder()
      .setUrl(`${BACKEND}/graph`)
      .setPayload(query)
      .setIsGraphQLEndpoint(true)
      .setAuthToken(props.auth.token)
      .build()
    try {
      props.dispatch(networkAction(true))
      // const response = await queryGraphQL(
      //   `${BACKEND}/graph`,
      //   query,
      //   props.auth.token
      // )
      const response = await fetch.exec()

      // console.log(response)
      if (response.media && response.media.length > 0) {
        setUserMedia([...userMedia, ...response.media])
        setMediaOffset(mediaOffset + 1)
      }
    } catch (err) {
      setUserError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const searchMedia = (e) => {
    e.preventDefault()
    reset()

    loadMedia()
  }

  const reset = () => {
    setUserMedia(defaults.userMedia)
    setMediaOffset(1)
  }

  const onMediaSelected = () => {
    props.onMediaSelected(userMedia[selectedMedia])
    // onClose()
  }

  const showUploadForm = () => {
    setUploadFormVisible(!uploadFormVisible)
  }

  return (
    <>
      <Grid container direction='column'>
        <Grid item className={classes.header}>
          <Typography variant='h3'>
            {MEDIA_MANAGER_PAGE_HEADING}
          </Typography>
        </Grid>
        {uploadFormVisible &&
        <Card>
          <form onSubmit={onUpload}>
            <CardContent>
              <Typography variant='h6' className={classes.cardHeader}>
                {MEDIA_MANAGER_DIALOG_TITLE}
              </Typography>
              {userError &&
                <div>
                  {userError}
                </div>}
              <Button
                variant="contained"
                component="label"
                color='primary'>
                {BUTTON_ADD_FILE}
                <input
                  type='file'
                  name='file'
                  ref={fileInput}
                  className={classes.fileUploadInput}
                />
              </Button>
              <TextField
                required
                variant='outlined'
                label='Title'
                fullWidth
                margin="normal"
                name='title'
                value={uploadData.title}
                onChange={onUploadDataChanged}/>
              <TextField
                required
                variant='outlined'
                label='Alt text'
                fullWidth
                margin="normal"
                name='altText'
                value={uploadData.altText}
                onChange={onUploadDataChanged}/>
            </CardContent>
            <CardActions>
              <Button type='submit'>
                {MEDIA_UPLOAD_BUTTON_TEXT}
              </Button>
            </CardActions>
          </form>
        </Card>
        }
        {!uploadFormVisible &&
        <Card>
          <CardContent>
            <form onSubmit={searchMedia}>
              <Grid container direction='row' alignItems='center'>
                <Grid item className={classes.searchField}>
                  <TextField
                    value={searchText}
                    variant='outlined'
                    label=''
                    fullWidth
                    margin="normal"
                    placeholder={MEDIA_SEARCH_INPUT_PLACEHOLDER}
                    onChange={onSearchTextChanged}/>
                </Grid>
                <Grid item>
                  <Button
                    type='submit'
                    variant={searchText.trim().length !== 0 ? 'contained' : 'text'}
                    disabled={searchText.trim().length === 0}>
                    {BUTTON_SEARCH}
                  </Button>
                </Grid>
              </Grid>
            </form>
            <GridList cols={3} className={classes.mediaGrid}>
              <GridListTile cols={3} key='Subheader' style={{ height: 'auto' }}>
                <ListSubheader component='div'>
                  {HEADER_YOUR_MEDIA}
                </ListSubheader>
              </GridListTile>
              {userMedia.map((item) =>
                <GridListTile key={item.id} cols={1}>
                  <img src={`${BACKEND}/media/${item.id}?thumb=1`} />
                  <GridListTileBar
                    title={item.title}
                    subtitle={item.mimeType}
                    actionIcon={
                      <IconButton className={classes.gridListItemIcon}>
                        <InfoOutlined />
                      </IconButton>
                    }/>
                </GridListTile>
              )}
            </GridList>
            {props.networkAction &&
                <AppLoader />}
            <Button onClick={loadMedia}>
              {LOAD_MORE_TEXT}
            </Button>
          </CardContent>
        </Card>
        }
      </Grid>
      <div className="container">
        {/* Upload Area */}
        {uploadFormVisible &&
        <div>

          {/* <button onClick={cancelMediaUpload}>{BUTTON_CANCEL_TEXT}</button> */}
        </div>
        }
        {/* {!uploadFormVisibility &&
        <button onClick={toggleUploadFormVisibility}>{MEDIA_ADD_NEW_BUTTON_TEXT}</button>} */}

        {/* Search Area */}
        {/* <div>
        <input
          type='text'
          name='search'
          value={searchText}
          placeholder={MEDIA_SEARCH_INPUT_PLACEHOLDER}
          onChange={onSearchTextChanged}/>
        <input
          type='submit'
          value='Search'
          onClick={searchMedia}
          disabled={searchText.trim().length !== 0 ? '' : 'disabled'}/>
      </div> */}

        <div>
          <button
            disabled={selectedMedia === null ? 'disabled' : ''}
            onClick={onMediaSelected}>Select</button>
          {/* <button
          onClick={onClose}>Cancel</button> */}
        </div>
        <Fab
          color={uploadFormVisible ? 'default' : 'secondary'}
          className={classes.fab}
          onClick={showUploadForm}>
          {uploadFormVisible ? <Done /> : <Add />}
        </Fab>
      </div>
    </>
  )
}

MediaManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  onMediaSelected: PropTypes.func.isRequired,
  mediaAdditionAllowed: PropTypes.bool,
  networkAction: PropTypes.bool.isRequired
  // toggleVisibility: PropTypes.func
}

const mapStateToProps = state => ({
  auth: state.auth,
  networkAction: state.networkAction
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MediaManager)
