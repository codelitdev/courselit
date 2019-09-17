import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogTitle } from '@material-ui/core'
import MediaManager from './MediaManager.js'
import {
  MEDIA_MANAGER_DIALOG_TITLE
} from '../config/strings.js'

const MediaManagerDialog = (props) => {
  const { onClose, open } = props

  const handleSelection = (path) => {
    onClose(path)
  }

  return (
    <Dialog onClose={handleSelection} open={open}>
      <DialogTitle>{MEDIA_MANAGER_DIALOG_TITLE}</DialogTitle>
      <MediaManager onMediaSelected={handleSelection}/>
    </Dialog>
  )
}

MediaManagerDialog.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired
}

export default MediaManagerDialog
