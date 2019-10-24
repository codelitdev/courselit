import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { siteInfoProps, authProps } from '../types'
import MediaManager from './MediaManager'
import {
  removeEmptyProperties,
  makeGraphQLQueryStringFromJSObject,
  queryGraphQLWithUIEffects
} from '../lib/utils.js'
import { BACKEND } from '../config/constants.js'
import { networkAction, newSiteInfoAvailable } from '../redux/actions.js'
import ImgSwitcher from './ImgSwitcher.js'
import { TextField, Button } from '@material-ui/core'
import { FORM_FIELD_LOGO } from '../config/strings.js'

const SiteSettings = props => {
  const [settings, setSettings] = useState({
    title: props.siteinfo.title,
    subtitle: props.siteinfo.subtitle,
    logopath: props.siteinfo.logopath,
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
    // setDataChanged(true)
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
        <TextField
          variant='outlined'
          label='Title'
          fullWidth
          margin="normal"
          name='title'
          value={settings.title}
          onChange={onChangeData}/>
        <TextField
          variant='outlined'
          label='Sub title'
          fullWidth
          margin="normal"
          name='subtitle'
          value={settings.subtitle}
          onChange={onChangeData}/>
        <ImgSwitcher
          title={FORM_FIELD_LOGO}
          src={settings.logopath || props.siteinfo.logopath}
          onSelection={onChangeData}/>
        <Button
          variant='contained'
          color='default'
          type='submit'
          value='Save'
          disabled={!!((!settings.title && !settings.subtitle && !settings.logopath))}>
            Save
        </Button>
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
