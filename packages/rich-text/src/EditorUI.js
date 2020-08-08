import React from "react";
import Editor from "./Editor.js";
import PropTypes from "prop-types";
import Styles from "./Styles.js";

const EditorUI = (props) => {
  const onChange = (editorState) => {
    props.onChange(editorState);
  };

  const editor = (
    <Editor
      editorState={props.editorState}
      onChange={onChange}
      readOnly={props.readOnly}
      theme={Object.assign({}, Styles, props.styles)}
    />
  );

  return props.readOnly ? editor : <>{editor}</>;
};

EditorUI.getDecorators = Editor.getDecorators;

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  styles: PropTypes.object,
};

export default EditorUI;
