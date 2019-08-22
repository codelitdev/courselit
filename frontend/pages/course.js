import { connect } from 'react-redux'

const Course = (props) => {
  return (
    <div>
      
    </div>
  )
}

const mapStateToProps = state => ({
  profile: state.profile
})

export default connect(mapStateToProps)(Course)
