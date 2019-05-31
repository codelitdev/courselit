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
  MEDIA_ADD_NEW_BUTTON_TEXT,
  BUTTON_CANCEL_TEXT,
  MEDIA_SEARCH_INPUT_PLACEHOLDER,
  LOAD_MORE_TEXT
} from '../config/strings.js'
import {
  BACKEND
} from '../config/constants.js'
import { authProps } from '../types.js'
import { networkAction } from '../redux/actions.js'
import {
  queryGraphQL
} from '../lib/utils.js'

let mediaOffset = 1

const MediaManager = (props) => {
  const initUploadData = {
    title: '',
    altText: '',
    uploading: false
  }
  const [uploadData, setUploadData] = useState(initUploadData)
  const [uploadFormVisibility, setUploadFormVisibility] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [userError, setUserError] = useState('')
  const [userMedia, setUserMedia] = useState([])
  const fileInput = createRef()

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
          'Authorization': `Bearer ${props.auth.token}`
        },
        body: fD
      })
      res = await res.json()

      if (res.id) {
        setUploadData(initUploadData)
        setUserMedia([res.id, ...userMedia])
      }
    } catch (err) {
      setUserError(err.message)
    }
  }

  const toggleUploadFormVisibility = () =>
    setUploadFormVisibility(!uploadFormVisibility)

  const onSearchTextChanged = (e) =>
    setSearchText(e.target.value)

  const cancelMediaUpload = () => {
    setUploadData(initUploadData)
    toggleUploadFormVisibility()
  }

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
    console.log(query)

    try {
      props.dispatch(networkAction(true))
      let response = await queryGraphQL(
        `${BACKEND}/graph`,
        query,
        props.auth.token
      )

      console.log(response)
      if (response.media && response.media.length > 0) {
        setUserMedia([...response.media.map(x => x.id), ...userMedia])
        mediaOffset += 1
      }
    } catch (err) {
      setUserError(err.message)
    } finally {
      props.dispatch(networkAction(false))
    }
  }

  const searchMedia = () => {
    setUserMedia(userMedia => [])
    mediaOffset = 1
    console.log(userMedia)
    loadMedia()
  }

  return (
    <div className="container">
      <p>Media manager</p>
      {uploadFormVisibility &&
        <div>
          <form onSubmit={onUpload}>
            <fieldset disabled={uploadData.uploading ? 'disabled' : ''}>
              {userError &&
                <div>{userError}</div>}
              <label> File:
                <input
                  type='file'
                  name='file'
                  ref={fileInput}/>
              </label>
              <label> Title:
                <input
                  type='text'
                  name='title'
                  value={uploadData.title}
                  onChange={onUploadDataChanged}/>
              </label>
              <label> Alt text:
                <input
                  type='text'
                  name='altText'
                  value={uploadData.altText}
                  onChange={onUploadDataChanged}/>
              </label>
              <input type='submit' value={MEDIA_UPLOAD_BUTTON_TEXT}/>
            </fieldset>
          </form>
          <button onClick={cancelMediaUpload}>{BUTTON_CANCEL_TEXT}</button>
        </div>
      }
      {!uploadFormVisibility &&
        <button onClick={toggleUploadFormVisibility}>{MEDIA_ADD_NEW_BUTTON_TEXT}</button>}
      <div className="explorer">
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
        <div className="userMedia">
          {userMedia.map((item, index) =>
            <img key={item} src={`${BACKEND}/media/${item}?thumb=1`} />
          )}
          <button onClick={loadMedia}>{LOAD_MORE_TEXT}</button>
        </div>
      </div>
      <style jsx>
        {`
          .container {
            background: #eee
          }
        `}
      </style>
    </div>
  )
}

MediaManager.propTypes = {
  auth: authProps,
  dispatch: PropTypes.func.isRequired
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
