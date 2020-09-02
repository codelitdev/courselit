import React, { useState } from "react";
import Editor from "./Editor.js";
import PropTypes from "prop-types";
import Styles from "./Styles.js";
import Code from "./Icons/code-24px.svg";
import Blockquote from "./Icons/format_quote-24px.svg";
import Bold from "./Icons/format_bold-24px.svg";
import Italic from "./Icons/format_italic-24px.svg";
import AddPhoto from "./Icons/add_photo_alternate-24px.svg";
import UnorderedListItem from "./Icons/format_list_bulleted-24px.svg";
import OrderedListItem from "./Icons/format_list_numbered-24px.svg";

const EditorUI = (props) => {
  const [imageAddFormVisible, setImageAddFormVisible] = useState(false);
  const [imageURL, setImageURL] = useState("");

  const onChange = (editorState) => {
    props.onChange(editorState);
  };

  const highlightCode = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleCode(props.editorState));
  };

  const toggleBlockquote = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleBlockquote(props.editorState));
  };

  const toggleBold = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleBold(props.editorState));
  };

  const toggleItalic = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleItalic(props.editorState));
  };

  const toggleHeading = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleHeading(props.editorState));
  };

  const toggleSubHeading = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleSubHeading(props.editorState));
  };

  const toggleUnorderedListItem = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleUnorderedListItem(props.editorState));
  };

  const toggleOrderedListItem = (e) => {
    e.preventDefault();
    props.onChange(Editor.toggleOrderedListItem(props.editorState));
  };

  const toggleImageAdd = (e) => {
    e.preventDefault();
    setImageAddFormVisible(!imageAddFormVisible);
  };

  const insertImage = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (imageURL) {
      props.onChange(Editor.addImage(props.editorState, imageURL));

      setImageURL("");
    }
  };

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
          <form onSubmit={insertImage}>
            <label>
              Image URL:
              <input
                type="text"
                name="imageurl"
                value={imageURL}
                onChange={(e) => setImageURL(e.target.value)}
              />
            </label>
            <button>Add</button>
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
        <button
          onClick={toggleUnorderedListItem}
          style={Styles.controls.toolbarButton}
        >
          <UnorderedListItem />
        </button>
        <button
          onClick={toggleOrderedListItem}
          style={Styles.controls.toolbarButton}
        >
          <OrderedListItem />
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
