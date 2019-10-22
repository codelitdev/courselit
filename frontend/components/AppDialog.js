import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogTitle } from '@material-ui/core'

const AppDialog = (props) => {
  const { onClose, onOpen } = props

  return (
    <Dialog onClose={onClose} open={onOpen}>
      <DialogTitle>{props.title}</DialogTitle>
      {props.children}
    </Dialog>
  )
}

AppDialog.propTypes = {
  onOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  children: PropTypes.array
}

export default AppDialog
