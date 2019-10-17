import React, { useState } from 'react'
import Editor from './Editor.js'
import PropTypes from 'prop-types'
import { BACKEND } from '../../config/constants.js'

import { Grid, IconButton } from '@material-ui/core'
import AddPhotoAlternate from '@material-ui/icons/AddPhotoAlternate'
import MediaManagerDialog from '../MediaManagerDialog.js'
import { makeStyles } from '@material-ui/styles'
import { MEDIA_MANAGER_DIALOG_TITLE } from '../../config/strings.js'

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
  },
  code: {
    background: '#eee'
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

  const highlightCode = () => {
    // props.onChange(
    //   Editor.highlightCode(props.editorState)
    // )
    props.onChange(
      Editor.formatCode(props.editorState)
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
            <IconButton onClick={highlightCode}>
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
        onOpen={addImageDialogOpened}
        onClose={handleMediaManagerClose}
        title={MEDIA_MANAGER_DIALOG_TITLE}/>
    </div>
  )
}

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool
}

export default EditorUI
