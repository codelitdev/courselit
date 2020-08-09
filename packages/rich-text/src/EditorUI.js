import React, { useState } from "react";
import Editor from "./Editor.js";
import PropTypes from "prop-types";
import Styles from "./Styles.js";
import Code from "./Icons/code-24px.svg";
import Blockquote from "./Icons/format_quote-24px.svg";
import Bold from "./Icons/format_bold-24px.svg";
import Italic from "./Icons/format_italic-24px.svg";
import AddPhoto from "./Icons/add_photo_alternate-24px.svg";

const EditorUI = (props) => {
  const [imageAddFormVisible, setImageAddFormVisible] = useState(false);

  const onChange = (editorState) => {
    props.onChange(editorState);
  };

  const highlightCode = () => {
    props.onChange(Editor.toggleCode(props.editorState));
  };

  const toggleBlockquote = () => {
    props.onChange(Editor.toggleBlockquote(props.editorState));
  };

  const toggleBold = () => {
    props.onChange(Editor.toggleBold(props.editorState));
  };

  const toggleItalic = () => {
    props.onChange(Editor.toggleItalic(props.editorState));
  };

  const toggleHeading = () => {
    props.onChange(Editor.toggleHeading(props.editorState));
  };

  const toggleSubHeading = () => {
    props.onChange(Editor.toggleSubHeading(props.editorState));
  };

  const toggleImageAdd = () => setImageAddFormVisible(!imageAddFormVisible);

  const editor = (
    <Editor
      editorState={props.editorState}
      onChange={onChange}
      readOnly={props.readOnly}
      theme={Object.assign({}, Styles, props.styles)}
    />
  );

  return props.readOnly ? (
    editor
  ) : (
    <div style={Styles.controls.container}>
      <div style={Styles.controls.editor}>{editor}</div>
      {imageAddFormVisible && (
        <div style={Styles.controls.toolbarInput}>
          <form>
            <label htmlFor="imageurl">Image URL</label>
            <input name="imageurl" />
            <input type="submit" value="Add" />
          </form>
        </div>
      )}
      <div style={Styles.controls.toolbar}>
        <button onClick={toggleHeading} style={Styles.controls.toolbarButton}>
          H1
        </button>
        <button
          onClick={toggleSubHeading}
          style={Styles.controls.toolbarButton}
        >
          H2
        </button>
        <button onClick={toggleBold} style={Styles.controls.toolbarButton}>
          <Bold />
        </button>
        <button onClick={toggleItalic} style={Styles.controls.toolbarButton}>
          <Italic />
        </button>
        <button onClick={highlightCode} style={Styles.controls.toolbarButton}>
          <Code />
        </button>
        <button
          onClick={toggleBlockquote}
          style={Styles.controls.toolbarButton}
        >
          <Blockquote />
        </button>
        <button onClick={toggleImageAdd} style={Styles.controls.toolbarButton}>
          <AddPhoto />
        </button>
      </div>
    </div>
  );
};

EditorUI.getDecorators = Editor.getDecorators;

EditorUI.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  styles: PropTypes.object,
};

export default EditorUI;
