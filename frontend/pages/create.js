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

const Create = (props) => {
  useEffect(() => {
    // if (doesNotHaveCreatorPrivs()) {
    //   console.log('Redirecting...', props)
    //   Router.push('/')
    // }
  })

  // const doesNotHaveCreatorPrivs = () => (props.auth.guest ||
  //   (props.profile.fetched && !props.profile.isCreator))

  // return <MasterLayoutWithAppBar>
  //   {/* {!doesNotHaveCreatorPrivs() &&
  //     <Creator />} */}
  //   {/* <Creator /> */}
  // </MasterLayoutWithAppBar>
  // const items = [
  //   { name: 'Courses', component: 'div' },
  //   { name: 'Settings', component: 'div' }
  // ]
  const items = {
    Courses: <Courses />,
    Users: <UsersManager />,
    Media: <MediaManager onMediaSelected={() => {}} toggleVisibility={() => {}} />,
    Settings: <SiteSettings />
  }
  return <ResponsiveDrawer items={items} pageTitle={CREATOR_AREA_PAGE_TITLE}/>
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(mapStateToProps)(Create)
