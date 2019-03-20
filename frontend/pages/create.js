/**
 * Dashboard for creators.
 */
import { connect } from 'react-redux'
import Router from 'next/router'
import ProtectedRoute from '../components/ProtectedRoute'
import { CREATOR_AREA_TEMPLATE } from '../config/strings'

const Create = (props) => <ProtectedRoute
  condition={props.auth.guest}
  router={Router}
  redirectTo='/login'
  renderOnServer={false}>
  <div>
    {CREATOR_AREA_TEMPLATE}
  </div>
</ProtectedRoute>

// Create.getInitialProps = async ({ store, isServer, pathname, query }) => {
//   return { }
// }

export default connect(state => state)(Create)
