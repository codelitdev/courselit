/**
 * Dashboard for creators.
 */
import { useEffect } from 'react'
import { connect } from 'react-redux'
import Router from 'next/router'
import {
  LibraryBooks,
  SupervisedUserCircle,
  PermMedia,
  SettingsApplications
} from '@material-ui/icons'
import ResponsiveDrawer from '../components/ResponsiveDrawer.js'
import SiteSettings from '../components/SiteSettings.js'
import { CREATOR_AREA_PAGE_TITLE } from '../config/strings.js'
import MediaManager from '../components/MediaManager.js'
import Courses from '../components/CoursesManager.js'
import UsersManager from '../components/UsersManager.js'
import AppLoader from '../components/AppLoader.js'

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

  const items = [
    {
      name: 'Courses',
      element: <Courses />,
      icon: <LibraryBooks />
    },
    {
      name: 'Media',
      element: <MediaManager onMediaSelected={() => {}} toggleVisibility={() => {}} />,
      icon: <PermMedia />
    }
  ]

  if (props.profile.isAdmin) {
    items.push(...[
      {
        name: 'Users',
        element: <UsersManager />,
        icon: <SupervisedUserCircle />
      },
      {
        name: 'Settings',
        element: <SiteSettings />,
        icon: <SettingsApplications />
      }
    ])
  }

  return props.profile.fetched && props.profile.isCreator
    ? (<ResponsiveDrawer items={items} pageTitle={CREATOR_AREA_PAGE_TITLE} />)
    : (<AppLoader />)
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(mapStateToProps)(Create)
