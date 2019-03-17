/**
 * Common layout for all pages
 */
// import { connect } from 'react-redux'
import Header from '../components/Header.js'

const MasterLayout = (props) => (
  <div>
    <Header
      title='Rayn Studios'
      subtitle='Learn to code'
      auth={props.auth}/>
    {props.children}
  </div>
)

export default MasterLayout
