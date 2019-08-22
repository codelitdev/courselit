import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { siteInfoProps, authProps } from '../types'
import Img from './Img'
import MediaManager from './MediaManager'
import {
  removeEmptyProperties,
  makeGraphQLQueryStringFromJSObject,
  queryGraphQLWithUIEffects
} from '../lib/utils.js'
import { BACKEND } from '../config/constants.js'
import { networkAction, newSiteInfoAvailable } from '../redux/actions.js'

const SiteSettings = props => {
  const [settings, setSettings] = useState({
    title: '',
    subtitle: '',
    logopath: '',
    err: ''
  })
  const [mediaManagerVisibility, setMediaManagerVisibility] = useState(false)
  const executeGQLCall = queryGraphQLWithUIEffects(
    `${BACKEND}/graph`,
    props.dispatch,
    networkAction,
    props.auth.token
  )

  const makeQueryForUpload = () =>
    makeGraphQLQueryStringFromJSObject(removeEmptyProperties(settings, 'err'))

  const handleSubmit = async (event) => {
    event.preventDefault()
    const query = `
    mutation {
      site: updateSiteInfo(siteData: ${makeQueryForUpload()}) {
        title,
        subtitle,
        logopath
      }
    }`
    console.log(query)
    try {
      await executeGQLCall(query, response => {
        if (response.site) props.dispatch(newSiteInfoAvailable(response.site))
      })
    } catch (e) {
      console.log(e)
    }
  }

  const onChangeData = (e) => {
    const change = typeof e === 'string' ? { logopath: e } : { [e.target.name]: e.target.value }
    setSettings(Object.assign({}, settings, change))
    console.log(settings)
  }

  const toggleMediaManagerVisibility = () =>
    setMediaManagerVisibility(!mediaManagerVisibility)

  return (
    <section>
      <h1>Site settings</h1>
      <form onSubmit={handleSubmit}>
        {settings.err &&
          <div>{settings.err}</div>
        }
        <label> Title:
          <p>Current: {props.siteinfo.title}</p>
          <input
            type='text'
            value={settings.title}
            name='title'
            placeholder='New title'
            onChange={onChangeData}/>
        </label>
        <label> Sub title:
          <p>Current: {props.siteinfo.subtitle}</p>
          <input
            type='text'
            value={settings.subtitle}
            name='subtitle'
            placeholder='New subtitle'
            onChange={onChangeData}/>
        </label>
        <label> Logo:
          <p>Current: </p>
          <Img src={props.siteinfo.logopath} isThumbnail={true} />
          {settings.logopath &&
            <div>
              <p>New: </p>
              <Img src={settings.logopath} isThumbnail={true} />
            </div>
          }
          <button type='button' onClick={toggleMediaManagerVisibility}>Change</button>
        </label>
        <button
          type='submit'
          value='Save'
          disabled={(!settings.title && !settings.subtitle && !settings.logopath) ? 'disabled' : ''}>
            Save
        </button>
      </form>
      {mediaManagerVisibility &&
        <MediaManager
          toggleVisibility={toggleMediaManagerVisibility}
          onMediaSelected={onChangeData}/>
      }
    </section>
  )
}

SiteSettings.propTypes = {
  siteinfo: siteInfoProps,
  auth: authProps,
  dispatch: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  siteinfo: state.siteinfo,
  auth: state.auth
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(SiteSettings)
// export default SiteSettings
