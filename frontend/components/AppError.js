import React from 'react'
import PropTypes from 'prop-types'
import { connect } from 'react-redux'
import { Snackbar, IconButton, Button } from '@material-ui/core'
import { clearAppError } from '../redux/actions'
import { appError } from '../types'
import { Close } from '@material-ui/icons'

const AppError = (props) => {
  const { error } = props
  const action = error && error.action
  console.log(error)

  const handleClose = (event, reason) => {
    if (reason === 'clickaway') {
      return
    }

    props.dispatch(clearAppError())
  }

  const getActionButtonsArray = () => {
    const actionButtonsArray = [
      <IconButton
        key="close"
        aria-label="close"
        color="inherit"
        onClick={handleClose}>
        <Close />
      </IconButton>
    ]
    if (action) {
      actionButtonsArray.unshift(
        <Button
          key="action"
          color="secondary"
          size="small"
          onClick={error.action.cb}>
          {error.action.text}
        </Button>
      )
    }

    return actionButtonsArray
  }

  return (
    <>
      {error &&
        <Snackbar
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'left'
          }}
          open={error.open}
          autoHideDuration={6000}
          onClose={handleClose}
          message={<span>{error.message}</span>}
          action={getActionButtonsArray()}
        />
      }
    </>
  )
}

AppError.propTypes = {
  error: appError.isRequired,
  dispatch: PropTypes.func.isRequired
}

const mapStateToProps = state => ({
  error: state.error
})

const mapDispatchToProps = dispatch => ({
  dispatch: dispatch
})

export default connect(
  mapStateToProps,
  mapDispatchToProps
)(AppError)
