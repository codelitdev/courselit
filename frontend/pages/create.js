/**
 * Dashboard for creators.
 */
import { connect } from 'react-redux'

const Create = (props) => (
  <div>
    Creators area
  </div>
)

Create.getInitialProps = async ({ store, isServer, pathname, query }) => {
  return {}
}

export default connect(state => state)(Create)
