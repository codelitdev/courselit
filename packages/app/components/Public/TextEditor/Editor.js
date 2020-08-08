import React from "react";
import {
  Editor as DraftJSEditor,
  EditorState,
  RichUtils,
  AtomicBlockUtils,
  DefaultDraftBlockRenderMap,
  CompositeDecorator,
} from "draft-js";
import PropTypes from "prop-types";
import MediaRenderer from "./MediaRenderer.js";
import CodeRenderer from "./CodeRenderer.js";
import { Map } from "immutable";
import VideoRenderer from "./VideoRenderer.js";
import TextRenderer from "./TextRenderer.js";
import BlockquoteRenderer from "./BlockquoteRenderer.js";
import LinkRenderer from "./LinkRenderer.js";

const Editor = (props) => {
  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command);
    if (newState) {
      props.onChange(newState);
      return "handled";
    }
    return "not handled";
  };

  const customBlockRenderer = (block) => {
    const blockType = block.getType();
    switch (blockType) {
      case "atomic":
        return {
          component: MediaRenderer,
          editable: false,
          props: {
            styles: props.theme.media,
          },
        };
      default:
      // do nothing
    }
  };

  const blockRenderMap = Map({
    unstyled: {
      element: "span",
      wrapper: <TextRenderer />,
    },
    blockquote: {
      element: "span",
      wrapper: <BlockquoteRenderer style={props.theme.blockquote} />,
    },
    "code-block": {
      element: "span",
      wrapper: <CodeRenderer style={props.theme.code} />,
    },
  });
  const extendedBlockRenderMap = DefaultDraftBlockRenderMap.merge(
    blockRenderMap
  );

  return (
    <DraftJSEditor
      editorKey="editor" // for data-editor invalid prop error
      editorState={props.editorState}
      onChange={props.onChange}
      readOnly={props.readOnly}
      handleKeyCommand={handleKeyCommand}
      blockRendererFn={customBlockRenderer}
      blockRenderMap={extendedBlockRenderMap}
    />
  );
};

Editor.addImage = (editorState, url) => {
  const contentState = editorState.getCurrentContent();
  const contentStateWithEntity = contentState.createEntity(
    MediaRenderer.IMAGE_TYPE,
    "IMMUTABLE",
    { options: { url } }
  );
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey();
  const newEditorState = EditorState.set(editorState, {
    currentContent: contentStateWithEntity,
  });
  return AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, " ");
};

Editor.toggleCode = (editorState) => RichUtils.toggleCode(editorState);
Editor.toggleLink = (editorState) =>
  RichUtils.toggleLink(editorState, editorState.getSelection(), null);
Editor.toggleBlockquote = (editorState) =>
  RichUtils.toggleBlockType(editorState, "blockquote");

Editor.getDecorators = () => {
  // From https://draftjs.org/docs/advanced-topics-decorators
  const findWithRegex = (regex, contentBlock, callback) => {
    const text = contentBlock.getText();
    let matchArr, start;
    while ((matchArr = regex.exec(text)) !== null) {
      start = matchArr.index;
      callback(start, start + matchArr[0].length);
    }
  };

  const videoStrategy = (contentBlock, callback, contentState) => {
    const YOUTUBE_REGEX = /https?:\/\/youtu.be\/[a-zA-Z0-9-_]+/g;
    findWithRegex(YOUTUBE_REGEX, contentBlock, callback);
  };

  const linkStrategy = (contentBlock, callback, contentState) => {
    // contentBlock.findEntityRanges(
    //   (character) => {
    //     const entityKey = character.getEntity();
    //     return (
    //       entityKey !== null &&
    //       contentState.getEntity(entityKey).getType() === 'LINK'
    //     );
    //   },
    //   callback
    // );
    // Regex from Stackoverflow: https://stackoverflow.com/a/3809435/942589
    const LINK_REGEX = /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)?/gi;
    findWithRegex(LINK_REGEX, contentBlock, callback);
  };

  return new CompositeDecorator([
    {
      strategy: videoStrategy,
      component: VideoRenderer,
    },
    {
      strategy: linkStrategy,
      component: LinkRenderer,
    },
  ]);
};

Editor.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  theme: PropTypes.object,
};

export default Editor;
