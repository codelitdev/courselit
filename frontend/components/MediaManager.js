import React, { useState, createRef } from 'react'
import { connect } from 'react-redux'
import fetch from 'isomorphic-unfetch'
import PropTypes from 'prop-types'
import {
  MEDIA_UPLOAD_BUTTON_TEXT,
  ERR_MEDIA_UPLOAD_TITLE_TEXT,
  MEDIA_MANAGER_PAGE_HEADING,
  MEDIA_MANAGER_DIALOG_TITLE,
  BUTTON_ADD_FILE,
  FILE_UPLOAD_SUCCESS,
  MEDIA_MANAGER_YOUR_MEDIA_HEADER
} from '../config/strings.js'
import { BACKEND } from '../config/constants.js'
import { authProps } from '../types.js'
import { setAppMessage } from '../redux/actions.js'
import {
  TextField,
  Button,
  Grid,
  Typography,
  Fab,
  CardActions,
  Card,
  CardContent
} from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import { Add, Done } from '@material-ui/icons'
import AppMessage from '../models/app-message.js'

import MediaGallery from './MediaGallery.js'

const useStyles = makeStyles(theme => ({
  header: {
    marginBottom: theme.spacing(1)
  },
  fab: {
    position: 'fixed',
    bottom: theme.spacing(4),
    right: theme.spacing(4)
  },
  fileUploadInput: {
    display: 'none'
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
    userError: '',
    selectedMedia: null
  }
  const [uploadData, setUploadData] = useState(defaults.uploadData)
  const [userError, setUserError] = useState(defaults.userError)
  // const [selectedMedia] = useState(defaults.selectedMedia)
  const fileInput = createRef()
  const classes = useStyles()
  const [uploadFormVisible, setUploadFormVisible] = useState(false)

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
        // setUserMedia([res.media, ...userMedia])
        props.dispatch(
          setAppMessage(new AppMessage(FILE_UPLOAD_SUCCESS))
        )
        setUploadFormVisible(false)
      }
    } catch (err) {
      setUserError(err.message)
    }
  }

  // const toggleUploadFormVisibility = () =>
  //   setUploadFormVisibility(!uploadFormVisibility)

  // const cancelMediaUpload = () => {
  //   setUploadData(defaults.uploadData)
  //   toggleUploadFormVisibility()
  // }

  // const onMediaSelected = () => {
  //   props.onMediaSelected(userMedia[selectedMedia])
  //   // onClose()
  // }

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
              <Typography variant='h6' className={classes.cardHeader}>
                {MEDIA_MANAGER_YOUR_MEDIA_HEADER}
              </Typography>
              <MediaGallery />
            </CardContent>
          </Card>}
        <Fab
          color={uploadFormVisible ? 'default' : 'secondary'}
          className={classes.fab}
          onClick={showUploadForm}>
          {uploadFormVisible ? <Done /> : <Add />}
        </Fab>
      </Grid>
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
