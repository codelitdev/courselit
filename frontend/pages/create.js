/**
 * Dashboard for creators.
 */
import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import Router from 'next/router'
import MasterLayout from '../components/Masterlayout.js'
import MasterLayoutWithAppBar from '../components/MasterLayoutWithAppBar.js'
import Creator from '../components/Creator.js'

const Create = (props) => {
  useEffect(() => {
    // if (doesNotHaveCreatorPrivs()) {
    //   console.log('Redirecting...', props)
    //   Router.push('/')
    // }
  })

  const doesNotHaveCreatorPrivs = () => (props.auth.guest ||
    (props.profile.fetched && !props.profile.isCreator))

  return <MasterLayoutWithAppBar>
    {/* {!doesNotHaveCreatorPrivs() &&
      <Creator />} */}
    <Creator />
  </MasterLayoutWithAppBar>
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(mapStateToProps)(Create)
