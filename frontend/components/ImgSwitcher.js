import PropTypes from 'prop-types'
import { BUTTON_IMAGE_CHANGE, DIALOG_TITLE_FEATURED_IMAGE } from '../config/strings.js'
import Img from './Img.js'
import MediaManagerDialog from './MediaManagerDialog.js'
import { useState } from 'react'

const ImgSwitcher = (props) => {
    const [dialogOpened, setDialogOpened] = useState(false)

    const onSelection = mediaID => {
        setDialogOpened(!dialogOpened)
        props.onSelection(mediaID)
    }

    return (
        <div>
            <Img src={props.src} isThumbnail={true} />
            <button onClick={() => setDialogOpened(!dialogOpened)}>{BUTTON_IMAGE_CHANGE}</button>
            <MediaManagerDialog
              onOpen={dialogOpened}
              onClose={onSelection}
              title={DIALOG_TITLE_FEATURED_IMAGE}
              mediaAdditionAllowed={false} />
        </div>
    )
}

ImgSwitcher.propTypes = {
    src: PropTypes.string,
    onSelection: PropTypes.func.isRequired
}

export default ImgSwitcher
