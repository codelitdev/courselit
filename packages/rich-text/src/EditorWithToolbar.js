import React, { useState } from "react";
import Editor from "./Editor.js";
import PropTypes from "prop-types";
import styles from "./styles.js";
import Code from "./Icons/code-24px.svg";
import Blockquote from "./Icons/format_quote-24px.svg";
import Bold from "./Icons/format_bold-24px.svg";
import Italic from "./Icons/format_italic-24px.svg";
import AddPhoto from "./Icons/add_photo_alternate-24px.svg";
import UnorderedListItem from "./Icons/format_list_bulleted-24px.svg";
import OrderedListItem from "./Icons/format_list_numbered-24px.svg";
import Link from "./Icons/link-24px.svg";

const EditorWithToolbar = (props) => {
  const [imageAddFormVisible, setImageAddFormVisible] = useState(false);
  const [linkAddFormVisible, setLinkAddFormVisible] = useState(false);
  const [imageURL, setImageURL] = useState("");
  const [linkLocation, setLinkLocation] = useState("");

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

  const toggleLinkAdd = (e) => {
    e.preventDefault();
    setLinkAddFormVisible(!linkAddFormVisible);
  };

  const insertImage = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (imageURL) {
      props.onChange(Editor.addImage(props.editorState, imageURL));

      setImageURL("");
    }
  };

  const insertLink = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (linkLocation) {
      props.onChange(Editor.addLink(props.editorState, linkLocation));

      setLinkLocation("");
    }
  };

  const editor = (
    <Editor
      editorState={props.editorState}
      onChange={onChange}
      readOnly={props.readOnly}
      theme={Object.assign({}, styles, props.styles)}
      blockRenderMap={props.blockRenderMap}
    />
  );

  return props.readOnly ? (
    editor
  ) : (
    <div style={styles.controls.container}>
      <div style={styles.controls.editor}>{editor}</div>
      {imageAddFormVisible && (
        <div style={styles.controls.toolbarInput}>
          <label>
            Image URL:
            <input
              type="text"
              name="imageurl"
              value={imageURL}
              onChange={(e) => setImageURL(e.target.value)}
            />
          </label>
          <button onClick={insertImage}>Add</button>
        </div>
      )}
      {linkAddFormVisible && (
        <div style={styles.controls.toolbarInput}>
          <label>
            Link:
            <input
              type="text"
              name="linkLocation"
              value={linkLocation}
              onChange={(e) => setLinkLocation(e.target.value)}
            />
          </label>
          <button onClick={insertLink}>Add</button>
        </div>
      )}
      <div style={styles.controls.toolbar}>
        <button onClick={toggleHeading} style={styles.controls.toolbarButton}>
          H1
        </button>
        <button
          onClick={toggleSubHeading}
          style={styles.controls.toolbarButton}
        >
          H2
        </button>
        <button onClick={toggleBold} style={styles.controls.toolbarButton}>
          <Bold />
        </button>
        <button onClick={toggleItalic} style={styles.controls.toolbarButton}>
          <Italic />
        </button>
        <button onClick={highlightCode} style={styles.controls.toolbarButton}>
          <Code />
        </button>
        <button
          onClick={toggleBlockquote}
          style={styles.controls.toolbarButton}
        >
          <Blockquote />
        </button>
        <button onClick={toggleImageAdd} style={styles.controls.toolbarButton}>
          <AddPhoto />
        </button>
        <button onClick={toggleLinkAdd} style={styles.controls.toolbarButton}>
          <Link />
        </button>
        <button
          onClick={toggleUnorderedListItem}
          style={styles.controls.toolbarButton}
        >
          <UnorderedListItem />
        </button>
        <button
          onClick={toggleOrderedListItem}
          style={styles.controls.toolbarButton}
        >
          <OrderedListItem />
        </button>
      </div>
    </div>
  );
};

EditorWithToolbar.getDecorators = Editor.getDecorators;

EditorWithToolbar.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  styles: PropTypes.object,
  blockRenderMap: PropTypes.object,
};

export default EditorWithToolbar;
