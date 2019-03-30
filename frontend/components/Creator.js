/**
 * This component lets the admin create content.
 */
import React from 'react'
import { connect } from "react-redux";

const Creator = (props) => (<div>
  hi
</div>)

const mapStateToProps = state => state
const mapDispatchToProps = dispatch => ({})
export default connect(
  mapStateToProps,
  mapDispatchToProps
)(Creator)