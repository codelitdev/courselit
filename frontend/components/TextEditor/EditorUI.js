import React, { useState } from 'react'
import Editor from './Editor.js'
import PropTypes from 'prop-types'
import { BACKEND } from '../../config/constants.js'

import { IconButton, Dialog, AppBar, Toolbar, Slide } from '@material-ui/core'
import { AddPhotoAlternate, Code, FormatQuote, InsertLink, Close, Edit } from '@material-ui/icons'
import MediaManager from '../MediaManager.js'
import { makeStyles } from '@material-ui/styles'
import { MEDIA_MANAGER_DIALOG_TITLE } from '../../config/strings.js'
import AppDialog from '../AppDialog.js'

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex'
  },
  editorContainer: {
    marginTop: theme.spacing(1),
    marginLeft: theme.spacing(1),
    marginRight: theme.spacing(1)
  },
  appBar: {
    position: 'relative'
  }
}))

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
    background: 'rgb(45, 45, 45)',
    color: '#e2e7ff',
    padding: '10px 16px',
    borderRadius: 2,
    fontFamily: '"Fira Code", monospace'
  },
  blockquote: {
    fontStyle: 'italic',
    marginTop: 10,
    marginBottom: 10,
    borderLeft: '5px solid #cecece',
    paddingLeft: 10,
    fontSize: '1.6em',
    color: '#686868'
  }
}

const Transition = React.forwardRef(function Transition (props, ref) {
  return <Slide direction="up" ref={ref} {...props} />
})

const EditorUI = (props) => {
  const [open, setOpen] = useState(false)
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
      Editor.toggleCode(props.editorState)
    )
  }

  const toggleBlockquote = () => {
    props.onChange(
      Editor.toggleBlockquote(props.editorState)
    )
  }

  const toggleLink = () => {
    props.onChange(
      Editor.toggleLink(props.editorState)
    )
  }

  const openMediaSelection = () =>
    setAddImageDialogOpened(true)

  const closeEditor = () => setOpen(false)

  const editor = <Editor
    editorState={props.editorState}
    onChange={onChange}
    readOnly={props.readOnly}
    theme={stylingForInternalComponentsOfDraftJS} />

  return props.readOnly ? editor : (
    <>
      <IconButton onClick={() => setOpen(true)}>
        <Edit />
      </IconButton>
      <Dialog
        fullScreen
        open={open}
        onClose={closeEditor}
        TransitionComponent={Transition}>
        <AppBar className={classes.appBar}>
          <Toolbar>
            <IconButton color='inherit' onClick={openMediaSelection}>
              <AddPhotoAlternate />
            </IconButton>
            <IconButton color='inherit' onClick={toggleLink}>
              <InsertLink />
            </IconButton>
            <IconButton color='inherit' onClick={highlightCode}>
              <Code />
            </IconButton>
            <IconButton color='inherit' onClick={toggleBlockquote}>
              <FormatQuote />
            </IconButton>
            <IconButton edge='end' color='inherit' onClick={closeEditor}>
              <Close />
            </IconButton>
          </Toolbar>
        </AppBar>
        {editor}
        {/* <MediaManagerDialog
          onOpen={addImageDialogOpened}
          onClose={handleMediaManagerClose}
          title={MEDIA_MANAGER_DIALOG_TITLE}/> */}
        <AppDialog
          onOpen={addImageDialogOpened}
          onClose={handleMediaManagerClose}
          title={MEDIA_MANAGER_DIALOG_TITLE}>
          <MediaManager
            onMediaSelected={handleMediaManagerClose}
            mediaAdditionAllowed={false} />
        </AppDialog>
      </Dialog>
    </>
  )
}

EditorUI.getDecorators = Editor.getDecorators

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool
}

export default EditorUI
