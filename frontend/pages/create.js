/**
 * Dashboard for creators.
 */
import { connect } from 'react-redux'
import Router from 'next/router'
import MasterLayout from './masterlayout.js'
import ProtectedRoute from '../components/ProtectedRoute'
import Creator from '../components/Creator.js'
// import { CREATOR_AREA_TEMPLATE } from '../config/strings'

const Create = (props) => (<MasterLayout>
  <ProtectedRoute
    condition={props.auth.guest || (props.profile.fetched && !props.profile.isCreator)}
    router={Router}
    redirectTo='/login'
    renderOnServer={false}>
    <div>
      <Creator />
      <p>Hi</p>
    </div>
  </ProtectedRoute>
</MasterLayout>)

// Create.getInitialProps = async ({ store, isServer, pathname, query }) => {
//   return { }
// }

export default connect(state => state)(Create)
