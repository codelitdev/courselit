import React from "react";
import PropTypes from "prop-types";

const MediaRenderer = props => {
  const entity = props.contentState.getEntity(props.block.getEntityAt(0));
  const type = entity.getType();
  const { options } = entity.getData();
  const { styles } = props.blockProps;

  let element;
  if (type === MediaRenderer.IMAGE_TYPE) {
    element = (
      <img
        style={styles.img}
        src={options.url}
        alt={options.alt}
        className={MediaRenderer.IMAGE_TYPE}
      />
    );
  }

  return <div style={styles.container}>{element}</div>;
};

MediaRenderer.IMAGE_TYPE = "IMAGE";
MediaRenderer.AUDIO_TYPE = "AUDIO";
MediaRenderer.VIDEO_TYPE = "VIDEO";

MediaRenderer.propTypes = {
  contentState: PropTypes.object,
  blockProps: PropTypes.object,
  block: PropTypes.object,
  options: PropTypes.shape({
    href: PropTypes.string,
    alt: PropTypes.string
  })
};

export default MediaRenderer;
