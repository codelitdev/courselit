import { connect } from 'react-redux'
import Header from '../components/header.js'

const Index = (props) => (
  <div>
    <Header
      title='Rayn Studios'
      subtitle='Learn to code'
      auth={props.auth}/>
  </div>
)

Index.getInitialProps = async ({ store, isServer, pathname, query }) => {
  return {}
}

export default connect(state => state)(Index)
