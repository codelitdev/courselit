import React from 'react'
import PropTypes from 'prop-types'
import Editor from 'draft-js-plugins-editor'
import 'draft-js-image-plugin/lib/plugin.css'
import { makeStyles } from '@material-ui/styles'

const useStyles = makeStyles({
  editor: {
    flex: 1
  }
})

const RichTextEditor = ({
  editorState,
  onChange,
  handleKeyCommand,
  plugins,
  readOnly = false
}) => {
  const classes = useStyles()

  return (
    <Editor
      className={classes.editor}
      editorState={editorState}
      onChange={onChange}
      readOnly={readOnly}
      handleKeyCommand={handleKeyCommand}
      editorKey="editor"
      plugins={plugins} />
  )
}

RichTextEditor.propTypes = {
  editorState: PropTypes.object.isRequired,
  onChange: PropTypes.func.isRequired,
  handleKeyCommand: PropTypes.func.isRequired,
  plugins: PropTypes.arrayOf(PropTypes.object).isRequired,
  readOnly: PropTypes.bool
}

export default RichTextEditor
