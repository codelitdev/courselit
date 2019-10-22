import React, { useState } from 'react'
import PropTypes from 'prop-types'
import { BUTTON_IMAGE_CHANGE, DIALOG_TITLE_FEATURED_IMAGE } from '../config/strings.js'
import Img from './Img.js'
import MediaManagerDialog from './MediaManagerDialog.js'

import { Grid, Button } from '@material-ui/core'

const ImgSwitcher = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false)

  const onSelection = mediaID => {
    setDialogOpened(!dialogOpened)
    props.onSelection(mediaID)
  }

  return (
    <Grid container>
      <Grid item>
        {props.title}
      </Grid>
      <Grid item>
        <Img src={props.src} isThumbnail={true} />
      </Grid>
      <Grid item>
        <Button onClick={() => setDialogOpened(!dialogOpened)}>
          {BUTTON_IMAGE_CHANGE}
        </Button>
      </Grid>
      <MediaManagerDialog
        onOpen={dialogOpened}
        onClose={onSelection}
        title={DIALOG_TITLE_FEATURED_IMAGE}
        mediaAdditionAllowed={false} />
    </Grid>
  )
}

ImgSwitcher.propTypes = {
  title: PropTypes.string,
  src: PropTypes.string,
  onSelection: PropTypes.func.isRequired
}

export default ImgSwitcher
