import { connect } from 'react-redux'
import MasterLayout from '../components/Masterlayout.js'

const Course = (props) => {
  return (
    <MasterLayout>
    </MasterLayout>
  )
}

Course.getInitialProps = props => {
}

const mapStateToProps = state => ({
  profile: state.profile
})

export default connect(mapStateToProps)(Course)
