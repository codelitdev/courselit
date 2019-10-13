/**
 * Dashboard for creators.
 */
import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import ResponsiveDrawer from '../components/ResponsiveDrawer.js'
import SiteSettings from '../components/SiteSettings.js'
import {
  CREATOR_AREA_PAGE_TITLE
} from '../config/strings.js'
import MediaManager from '../components/MediaManager.js'
import Courses from '../components/Courses.js'
import UsersManager from '../components/UsersManager.js'
import Router from 'next/router'

const Create = (props) => {
  useEffect(() => {
    if (props.profile.fetched && !props.profile.isCreator) {
      Router.push('/')
    }
  }, [props.profile.fetched])

  useEffect(() => {
    if (props.auth.checked && props.auth.guest) {
      Router.push('/')
    }
  }, [props.auth.checked])

  const items = {
    Courses: <Courses />,
    Users: <UsersManager />,
    Media: <MediaManager onMediaSelected={() => {}} toggleVisibility={() => {}} />,
    Settings: <SiteSettings />
  }
  return props.profile.fetched 
    ? (<ResponsiveDrawer items={items} pageTitle={CREATOR_AREA_PAGE_TITLE}/>)
    :
    <p>Loading...</p>
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(mapStateToProps)(Create)
