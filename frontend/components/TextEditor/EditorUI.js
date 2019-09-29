import React, { useState } from 'react'
import Editor from './Editor.js'
import PropTypes from 'prop-types'
import { BACKEND } from '../../config/constants.js'

import { Grid, IconButton } from '@material-ui/core'
import AddPhotoAlternate from '@material-ui/icons/AddPhotoAlternate'
import MediaManagerDialog from '../MediaManagerDialog.js'
import { makeStyles } from '@material-ui/styles'

const useStyles = makeStyles({
  container: {
    height: 100,
    maxHeight: 300
  }
})

const stylingForInternalComponentsOfDraftJS = {
  media: {
    container: {
      display: 'flex',
      justifyContent: 'center'
    },
    img: {
      maxWidth: '100%'
    }
  }
}

const EditorUI = (props) => {
  const [addImageDialogOpened, setAddImageDialogOpened] = useState(false)
  const classes = useStyles()

  const onChange = (editorState) => {
    props.onChange(editorState)
  }

  const handleMediaManagerClose = url => {
    setAddImageDialogOpened(false)
    props.onChange(
      Editor.addImage(props.editorState, `${BACKEND}/media/${url}`)
    )
  }

  return (
    <div>
      <Grid container direction='column'>
        {!props.readOnly &&
          <Grid item>
            <IconButton onClick={() => setAddImageDialogOpened(true)}>
              <AddPhotoAlternate />
            </IconButton>
          </Grid>
        }
        <Grid item className={classes.container}>
          <Editor
            editorState={props.editorState}
            onChange={onChange}
            readOnly={props.readOnly}
            theme={stylingForInternalComponentsOfDraftJS} />
        </Grid>
      </Grid>
      <MediaManagerDialog
        open={addImageDialogOpened}
        onClose={handleMediaManagerClose}/>
    </div>
  )
}

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool
}

export default EditorUI
