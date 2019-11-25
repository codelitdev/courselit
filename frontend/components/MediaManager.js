/**
 * Component for managing all media across the app
 */
import React, { useState, createRef } from 'react'
import { connect } from 'react-redux'
import fetch from 'isomorphic-unfetch'
import PropTypes from 'prop-types'
import {
  MEDIA_UPLOAD_BUTTON_TEXT,
  ERR_MEDIA_UPLOAD_TITLE_TEXT,
  MEDIA_SEARCH_INPUT_PLACEHOLDER,
  LOAD_MORE_TEXT
} from '../config/strings.js'
import { BACKEND } from '../config/constants.js'
import { authProps } from '../types.js'
import { networkAction } from '../redux/actions.js'
import {
  queryGraphQL
} from '../lib/utils.js'
import {
  TextField,
  Button
} from '@material-ui/core'

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
  const [uploadFormVisibility] = useState(defaults.uploadFormVisibility)
  const [searchText, setSearchText] = useState(defaults.searchText)
  const [userError, setUserError] = useState(defaults.userError)
  // contains information about user's already uploaded media
  const [userMedia, setUserMedia] = useState(defaults.userMedia)
  const [selectedMedia, setSelectedMedia] = useState(defaults.selectedMedia)
  const fileInput = createRef()
  const [mediaOffset, setMediaOffset] = useState(1)

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

      if (res.id) {
        setUploadData(defaults.uploadData)
        setUserMedia([res.id, ...userMedia])
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

    try {
      props.dispatch(networkAction(true))
      const response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      // console.log(response)
      if (response.media && response.media.length > 0) {
        setUserMedia([...response.media.map(x => x.id), ...userMedia])
        setMediaOffset(mediaOffset + 1)
      }
    } catch (err) {
      setUserError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const searchMedia = () => {
    // reset a few components
    setUserMedia(defaults.userMedia)
    setMediaOffset(1)
    loadMedia()
  }

  const onMediaSelected = () => {
    props.onMediaSelected(userMedia[selectedMedia])
    // onClose()
  }

  // Restore the defaults
  // const reset = () => {
  //   mediaOffset = DEFAULT_MEDIA_OFFSET
  //   setUploadData(defaults.uploadData)
  //   setUploadFormVisibility(defaults.uploadFormVisibility)
  //   setSearchText(defaults.searchText)
  //   setUserError(defaults.userError)
  //   setUserMedia(defaults.userMedia)
  //   setSelectedMedia(defaults.selectedMedia)
  // }

  // const onClose = () => {
  //   reset()
  //   props.toggleVisibility(false)
  // }

  return (
    <div className="container">
      {/* Upload Area */}
      {uploadFormVisibility &&
        <div>
          <form onSubmit={onUpload}>
            <fieldset disabled={uploadData.uploading ? 'disabled' : ''}>
              {userError &&
                <div>{userError}</div>}
              <Button label='Select a file'>
                <input
                  type='file'
                  name='file'
                  ref={fileInput}/>
              </Button>
              <label> File:
                <input
                  type='file'
                  name='file'
                  ref={fileInput}/>
              </label>
              {/* <label> Title:
                <input
                  type='text'
                  name='title'
                  value={uploadData.title}
                  onChange={onUploadDataChanged}/>
              </label> */}
              <TextField
                required
                variant='outlined'
                label='Title'
                fullWidth
                margin="normal"
                name='title'
                value={uploadData.title}
                onChange={onUploadDataChanged}/>
              {/* <label> Alt text:
                <input
                  type='text'
                  name='altText'
                  value={uploadData.altText}
                  onChange={onUploadDataChanged}/>
              </label> */}
              <TextField
                required
                variant='outlined'
                label='Alt text'
                fullWidth
                margin="normal"
                name='altText'
                value={uploadData.altText}
                onChange={onUploadDataChanged}/>
              <input type='submit' value={MEDIA_UPLOAD_BUTTON_TEXT}/>
            </fieldset>
          </form>
          {/* <button onClick={cancelMediaUpload}>{BUTTON_CANCEL_TEXT}</button> */}
        </div>
      }
      {/* {!uploadFormVisibility &&
        <button onClick={toggleUploadFormVisibility}>{MEDIA_ADD_NEW_BUTTON_TEXT}</button>} */}

      {/* Search Area */}
      <div>
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
      </div>

      {/* Explorer Area */}
      <div className="explorer">
        <div className="userMedia">
          {userMedia.map((item, index) =>
            <div
              key={item}
              onClick={() => setSelectedMedia(index)}
              className={ selectedMedia === index ? 'selected' : '' }>
              <img src={`${BACKEND}/media/${item}?thumb=1`} />
            </div>
          )}
          <button onClick={loadMedia}>{LOAD_MORE_TEXT}</button>
        </div>
      </div>

      <div>
        <button
          disabled={selectedMedia === null ? 'disabled' : ''}
          onClick={onMediaSelected}>Select</button>
        {/* <button
          onClick={onClose}>Cancel</button> */}
      </div>
    </div>
  )
}

MediaManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  onMediaSelected: PropTypes.func.isRequired,
  mediaAdditionAllowed: PropTypes.bool
  // toggleVisibility: PropTypes.func
}

const mapStateToProps = state => ({
  auth: state.auth
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(MediaManager)
