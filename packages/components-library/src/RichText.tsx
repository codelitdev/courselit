import * as React from "react";
import TextEditor from "@courselit/rich-text";
import { Typography } from "@material-ui/core";

interface RichTextBlockProps {
  children?: any;
}

const Text = (props: RichTextBlockProps) => {
  return <Typography variant="body1">{props.children}</Typography>;
};

const HeaderOne = (props: RichTextBlockProps) => {
  return (
    <Typography variant="h4" component="header">
      {props.children}
    </Typography>
  );
};

const HeaderTwo = (props: RichTextBlockProps) => {
  return (
    <Typography variant="h5" component="header">
      {props.children}
    </Typography>
  );
};

const Blockquote = (props: RichTextBlockProps) => {
  return <Typography variant="overline">{props.children}</Typography>;
};

interface RichTextProps {
  initialContentState: any;
  readOnly?: boolean;
  onChange?: (editorState: any) => void;
  styles?: any;
}

const RichText = (props: RichTextProps) => {
  const blockRenderMap = {
    unstyled: {
      element: "p",
      wrapper: <Text />,
    },
    "header-one": {
      element: "h1",
      wrapper: <HeaderOne />,
    },
    "header-two": {
      element: "h2",
      wrapper: <HeaderTwo />,
    },
    blockquote: {
      element: "blockquote",
      wrapper: <Blockquote />,
    },
  };

  return (
    <TextEditor
      initialContentState={props.initialContentState}
      onChange={props.onChange}
      readOnly={props.readOnly}
      styles={props.styles}
      blockRenderMap={blockRenderMap}
    />
  );
};

RichText.hydrate = TextEditor.hydrate;
RichText.stringify = TextEditor.stringify;
RichText.emptyState = TextEditor.emptyState;

export default RichText;
