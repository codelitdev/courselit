import React from 'react'
import PropTypes from 'prop-types'
import Header from './Header.js'
import { connect } from 'react-redux'
import { Container, makeStyles, LinearProgress } from '@material-ui/core'

const useStyles = makeStyles({
  root: {
    marginTop: 10
  },
  showProgressBar: props => ({
    visibility: props ? 'visible' : 'hidden'
  })
})

const MasterLayout = (props) => {
  const classes = useStyles(props.networkAction)
  return (
    <div>
      <LinearProgress className={classes.showProgressBar}/>
      <Container maxWidth='md' className={classes.root}>
        <Header />
        {props.children}
      </Container>
    </div>
  )
}

MasterLayout.propTypes = {
  children: PropTypes.object,
  networkAction: PropTypes.bool
}

const mapStateToProps = state => ({
  networkAction: state.networkAction
})

export default connect(
  mapStateToProps
)(MasterLayout)
