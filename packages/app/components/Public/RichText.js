import React from "react";
import PropTypes from "prop-types";
import TextEditor from "@courselit/rich-text";
import { useTheme } from "@material-ui/styles";

const RichText = (props) => {
  const theme = useTheme();

  return (
    <TextEditor
      initialContentState={props.initialContentState}
      onChange={props.onChange}
      readOnly={props.readOnly}
      styles={theme.richText}
    />
  );
};

RichText.hydrate = TextEditor.hydrate;
RichText.stringify = TextEditor.stringify;
RichText.emptyState = TextEditor.emptyState;

RichText.propTypes = {
  initialContentState: PropTypes.any,
  onChange: PropTypes.func,
  readOnly: PropTypes.bool,
};

export default RichText;
