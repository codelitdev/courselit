import { connect } from 'react-redux'
import MasterLayout from './masterlayout'

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
