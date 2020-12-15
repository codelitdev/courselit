import React from "react";
import PropTypes from "prop-types";

// TODO: Refactor this if not used
const Media = (props) => {
  const entity = props.contentState.getEntity(props.block.getEntityAt(0));
  const type = entity.getType();
  const { options } = entity.getData();
  const { styles } = props.blockProps;

  let element;
  if (type === Media.IMAGE_TYPE) {
    element = <img style={styles.img} src={options.url} />;
  }

  if (type === Media.VIDEO_TYPE) {
    element = (
      <video controls controlsList="nodownload">
        <source src={options.url} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    );
  }

  return (
    <div style={styles.container}>
      {element}
      {props.children}
    </div>
  );
};

Media.IMAGE_TYPE = "IMAGE";
Media.AUDIO_TYPE = "AUDIO";
Media.VIDEO_TYPE = "VIDEO";

Media.propTypes = {
  contentState: PropTypes.object,
  blockProps: PropTypes.object,
  block: PropTypes.object,
  options: PropTypes.shape({
    href: PropTypes.string,
    alt: PropTypes.string,
  }),
  children: PropTypes.array,
};

export default Media;
