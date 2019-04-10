import { connect } from 'react-redux'
import MasterLayout from './masterlayout.js'

const Index = (props) => (
  <MasterLayout>
    <div></div>
  </MasterLayout>
)

// Index.getInitialProps = async ({ store, isServer, pathname, query }) => {
//   return {}
// }

export default connect(state => state)(Index)
