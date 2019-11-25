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
import { TextField, Button, Typography } from '@material-ui/core'
import {
  SITE_SETTINGS_TITLE,
  SITE_SETTINGS_SUBTITLE,
  SITE_SETTINGS_CURRENCY_UNIT,
  SITE_SETTINGS_LOGO,
  SITE_SETTINGS_COPYRIGHT_TEXT,
  SITE_SETTINGS_ABOUT_TEXT,
  SITE_SETTINGS_PAGE_HEADING
} from '../config/strings.js'

const SiteSettings = props => {
  const [settings, setSettings] = useState({
    title: props.siteinfo.title,
    subtitle: props.siteinfo.subtitle,
    logopath: props.siteinfo.logopath,
    currencyUnit: props.siteinfo.currencyUnit,
    copyrightText: props.siteinfo.copyrightText,
    about: props.siteinfo.about,
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
        logopath,
        currencyUnit,
        copyrightText,
        about
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
      <Typography variant='h3'>
        {SITE_SETTINGS_PAGE_HEADING}
      </Typography>
      <form onSubmit={handleSubmit}>
        {settings.err &&
          <div>{settings.err}</div>
        }
        <TextField
          variant='outlined'
          label={SITE_SETTINGS_TITLE}
          fullWidth
          margin="normal"
          name='title'
          value={settings.title}
          onChange={onChangeData}/>
        <TextField
          variant='outlined'
          label={SITE_SETTINGS_SUBTITLE}
          fullWidth
          margin="normal"
          name='subtitle'
          value={settings.subtitle}
          onChange={onChangeData}/>
        <TextField
          variant='outlined'
          label={SITE_SETTINGS_CURRENCY_UNIT}
          fullWidth
          margin="normal"
          name='currencyUnit'
          value={settings.currencyUnit}
          onChange={onChangeData}/>
        <TextField
          variant='outlined'
          label={SITE_SETTINGS_COPYRIGHT_TEXT}
          fullWidth
          margin="normal"
          name='copyrightText'
          value={settings.copyrightText}
          onChange={onChangeData}/>
        <TextField
          variant='outlined'
          label={SITE_SETTINGS_ABOUT_TEXT}
          fullWidth
          margin="normal"
          name='about'
          value={settings.about}
          onChange={onChangeData}/>
        <ImgSwitcher
          title={SITE_SETTINGS_LOGO}
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
