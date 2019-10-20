import React from 'react'
import PropTypes from 'prop-types'
import Header from './Header.js'
import { connect } from 'react-redux'
import { Container, LinearProgress } from '@material-ui/core'
import { makeStyles } from '@material-ui/styles'
import CssBaseline from '@material-ui/core/CssBaseline'

const useStyles = makeStyles({
  root: {
    marginTop: 10
  },
  showProgressBar: props => ({
    visibility: props.networkAction ? 'visible' : 'hidden'
  })
})

const MasterLayout = (props) => {
  const classes = useStyles(props)
  return (
    <div>
      <CssBaseline />
      <Header />
      <LinearProgress className={classes.showProgressBar}/>
      <Container maxWidth='md' className={classes.root}>
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
