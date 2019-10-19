import React from 'react'
import {
  Editor as DraftJSEditor,
  EditorState,
  RichUtils,
  AtomicBlockUtils,
  DefaultDraftBlockRenderMap,
  Modifier,
  CompositeDecorator
} from 'draft-js'
import getFragmentFromSelection from 'draft-js/lib/getFragmentFromSelection'
import PropTypes from 'prop-types'
// import 'draft-js/dist/Draft.css'
import MediaRenderer from './MediaRenderer.js'
import CodeRenderer from './CodeRenderer.js'
import { Map } from 'immutable'
import VideoRenderer from './VideoRenderer.js'
import TextRenderer from './TextRenderer.js'
import BlockquoteRenderer from './BlockquoteRenderer.js'

const Editor = (props) => {
  // const findCodeEntities = (contentBlock, callback, contentState) => {
  //   contentBlock.findEntityRanges(
  //     (character) => {
  //       const entityKey = character.getEntity()
  //       return (
  //         entityKey !== null &&
  //         contentState.getEntity(entityKey).getType() === 'CODE'
  //       );
  //     },
  //     callback
  //   );
  // }

  // const decorators = new CompositeDecorator([
  //   {
  //     strategy: findCodeEntities,
  //     component: CodeRenderer,
  //     props: {
  //       styles: props.theme.code
  //     }
  //   }
  // ])

  const handleKeyCommand = (command, editorState) => {
    const newState = RichUtils.handleKeyCommand(editorState, command)
    if (newState) {
      props.onChange(newState)
      return 'handled'
    }
    return 'not handled'
  }

  const customBlockRenderer = block => {
    const blockType = block.getType()
    switch (blockType) {
      case 'atomic':
        return {
          component: MediaRenderer,
          editable: false,
          props: {
            styles: props.theme.media
          }
        }
      // case 'blockquote':
      //   return {
      //     component: BlockquoteRenderer,
      //     editable: true,
      //     props: {
      //       styles: props.theme.code
      //     }
      //   }
      default:
        // do nothing
    }
    // if (block.getType() === 'atomic') {
    //   return {
    //     component: MediaRenderer,
    //     editable: false,
    //     props: {
    //       styles: props.theme.media
    //     }
    //   }
    // }
  }

  // const customBlockStyle = block => {
  //   const type = block.getType()
  //   if (type === 'atomic') {
  //     return 'media'
  //   }
  // }

  // const customStyles = block => {
  //   const type = block.getType()
  //   if (type === 'pre') {
  //     return 'code'
  //   }
  // }

  const blockRenderMap = Map({
    'unstyled': {
      element: 'span',
      wrapper: <TextRenderer />
    },
    'blockquote': {
      element: 'span',
      wrapper: <BlockquoteRenderer style={props.theme.blockquote}/>
    }
  })
  const extendedBlockRenderMap = DefaultDraftBlockRenderMap.merge(blockRenderMap)

  return (
    <DraftJSEditor
        editorKey="editor" // for data-editor invalid prop error
        editorState={props.editorState}
        onChange={props.onChange}
        readOnly={props.readOnly}
        handleKeyCommand={handleKeyCommand}
        blockRendererFn={customBlockRenderer}
        blockRenderMap={extendedBlockRenderMap} />
  )
}

Editor.addImage = (editorState, url) => {
  const contentState = editorState.getCurrentContent()
  const contentStateWithEntity = contentState.createEntity(
    MediaRenderer.IMAGE_TYPE,
    'IMMUTABLE',
    { options: { url } }
  )
  const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
  const newEditorState = EditorState.set(editorState, {
    currentContent: contentStateWithEntity
  })
  return AtomicBlockUtils.insertAtomicBlock(newEditorState, entityKey, ' ')
}

// Editor.highlightCode = (editorState) => {
//   const contentState = editorState.getCurrentContent()
//   const selectionState = editorState.getSelection()
//   console.log(selectionState)
//   if (selectionState.isCollapsed()) {
//     return editorState
//   }
//   const contentStateWithEntity = contentState.createEntity(
//     'CODE',
//     'IMMUTABLE',
//     { 
//       text: getFragmentFromSelection(editorState).map(x => x.getText()).join('\n')
//     }
//   )
//   const entityKey = contentStateWithEntity.getLastCreatedEntityKey()
//   const contentStateWithCode = Modifier.applyEntity(
//     contentStateWithEntity,
//     selectionState,
//     entityKey
//   )
//   const newEditorState = EditorState.push(editorState, contentStateWithCode)
//   return newEditorState
// }

Editor.toggleCode = (editorState) => RichUtils.toggleCode(editorState)
Editor.toggleBlockquote = (editorState) => RichUtils.toggleBlockType(editorState, 'blockquote')

Editor.getDecorators = () => {
  // From https://draftjs.org/docs/advanced-topics-decorators
  const findWithRegex = (regex, contentBlock, callback) => {
    const text = contentBlock.getText();
    let matchArr, start
    while ((matchArr = regex.exec(text)) !== null) {
      start = matchArr.index
      callback(start, start + matchArr[0].length)
    }
  }

  const videoStrategy = (contentBlock, callback, contentState) => {
    const YOUTUBE_REGEX = /https?:\/\/youtu.be\/[a-zA-Z0-9-_]+/g
    findWithRegex(YOUTUBE_REGEX, contentBlock, callback)
  }

  return new CompositeDecorator([
    {
      strategy: videoStrategy,
      component: VideoRenderer
    }
  ])
}

Editor.propTypes = {
  editorState: PropTypes.object,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
  theme: PropTypes.object
}

export default Editor
