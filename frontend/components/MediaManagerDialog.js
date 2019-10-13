import React from 'react'
import PropTypes from 'prop-types'
import { Dialog, DialogTitle } from '@material-ui/core'
import MediaManager from './MediaManager.js'

const MediaManagerDialog = (props) => {
  const { onClose, onOpen } = props
  console.log(props.mediaAdditionAllowed)

  const handleSelection = (path) => {
    onClose(path)
  }

  return (
    <Dialog onClose={handleSelection} open={onOpen}>
      <DialogTitle>{props.title}</DialogTitle>
      <MediaManager
        onMediaSelected={handleSelection}
        mediaAdditionAllowed={props.mediaAdditionAllowed} />
    </Dialog>
  )
}

MediaManagerDialog.propTypes = {
  onOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string.isRequired,
  mediaAdditionAllowed: PropTypes.bool
}

export default MediaManagerDialog
