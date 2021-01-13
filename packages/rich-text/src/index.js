import React, { useState } from "react";
import Editor from "./EditorWithToolbar.js";
import { convertFromRaw, convertToRaw, EditorState } from "draft-js";
import PropTypes from "prop-types";
import { encode, decode } from "base-64";

const stringifyAndEncode = {
  encode: (objectToBeEncoded) =>
    encode(unescape(encodeURIComponent(JSON.stringify(objectToBeEncoded)))),
  decode: (fromEncodedString) =>
    JSON.parse(decodeURIComponent(escape(decode(fromEncodedString)))),
};

const TextEditor = (props) => {
  const initState = props.initialContentState || TextEditor.emptyState();
  const [editorState, setEditorState] = useState(initState);

  React.useEffect(() => {
    setEditorState(props.initialContentState);
  }, [props.initialContentState]);

  const onChange = (editorState) => {
    setEditorState(editorState);
    props.onChange && props.onChange(editorState);
  };

  return (
    <Editor
      editorState={editorState}
      onChange={onChange}
      readOnly={props.readOnly}
      styles={props.styles}
      blockRenderMap={props.blockRenderMap}
    />
  );
};

TextEditor.hydrate = ({
  data: encodedEditorStateString,
  prismDefaultLanguage,
}) =>
  EditorState.createWithContent(
    convertFromRaw(stringifyAndEncode.decode(encodedEditorStateString)),
    Editor.getDecorators({ prismDefaultLanguage })
  );

TextEditor.stringify = (editorState) =>
  stringifyAndEncode.encode(convertToRaw(editorState.getCurrentContent()));

TextEditor.emptyState = () => EditorState.createEmpty(Editor.getDecorators({}));

TextEditor.propTypes = {
  initialContentState: PropTypes.any,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  styles: PropTypes.object,
  blockRenderMap: PropTypes.object,
};

export default TextEditor;
