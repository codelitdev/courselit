/**
 * Dashboard for creators.
 */
import React, { useEffect } from 'react'
import { connect } from 'react-redux'
import Router from 'next/router'
import MasterLayout from '../components/Masterlayout.js'
import Creator from '../components/Creator.js'

const Create = (props) => {
  useEffect(() => {
    if (doesNotHaveCreatorPrivs()) {
      console.log('Redirecting...', props)
      Router.push('/')
    }
  })

  const doesNotHaveCreatorPrivs = () => (props.auth.guest ||
    (props.profile.fetched && !props.profile.isCreator))

  return <MasterLayout>
    {!doesNotHaveCreatorPrivs() &&
      <Creator />}
  </MasterLayout>
}

const mapStateToProps = state => ({
  auth: state.auth,
  profile: state.profile
})

export default connect(mapStateToProps)(Create)
