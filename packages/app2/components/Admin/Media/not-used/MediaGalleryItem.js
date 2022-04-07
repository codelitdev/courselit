import { ImageListItemBar, IconButton } from "@mui/material";
import { styled } from "@mui/material/styles";
import { Edit } from "@mui/icons-material";
import React, { useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { addressProps } from "../../../types";

const PREFIX = "MediaGalleryItem";

const classes = {
  gridListItemIcon: `${PREFIX}-gridListItemIcon`,
  thumbnail: `${PREFIX}-thumbnail`,
};

// TODO jss-to-styled codemod: The Fragment root was replaced by div. Change the tag if needed.
const Root = styled("div")({
  [`& .${classes.gridListItemIcon}`]: {
    color: "#fff",
  },
  [`& .${classes.thumbnail}`]: {
    width: "100%",
    height: "auto",
  },
});

const MediaGalleryItem = ({ item, toggleMediaEditForm, address }) => {
  const [imgSrc, setImgSrc] = useState(
    `${address.backend}/media/${item.id}?thumb=1`
  );

  const onImgLoadError = () => setImgSrc("/courselit_backdrop.webp");

  return (
    <Root>
      <img
        src={imgSrc}
        onError={onImgLoadError}
        className={classes.thumbnail}
      />
      <ImageListItemBar
        title={item.title}
        subtitle={item.mimeType}
        actionIcon={
          <IconButton
            className={classes.gridListItemIcon}
            onClick={() => toggleMediaEditForm(item)}
            size="large"
          >
            <Edit />
          </IconButton>
        }
      />
    </Root>
  );
};

MediaGalleryItem.propTypes = {
  item: PropTypes.object.isRequired,
  toggleMediaEditForm: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(MediaGalleryItem);
