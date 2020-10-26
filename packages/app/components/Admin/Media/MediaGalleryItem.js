import { GridListTileBar, IconButton } from "@material-ui/core";
import { Edit } from "@material-ui/icons";
import React, { useState } from "react";
import { BACKEND } from "../../../config/constants.js";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles({
  gridListItemIcon: {
    color: "#fff",
  },
  thumbnail: {
    width: "100%",
    height: "auto",
  },
});

const MediaGalleryItem = (props) => {
  const { item, toggleMediaEditForm } = props;
  const [imgSrc, setImgSrc] = useState(`${BACKEND}/media/${item.id}?thumb=1`);
  const classes = useStyles();

  const onImgLoadError = () => setImgSrc("/courselit_backdrop.webp");

  return (
    <>
      <img
        src={imgSrc}
        onError={onImgLoadError}
        className={classes.thumbnail}
      />
      <GridListTileBar
        title={item.title}
        subtitle={item.mimeType}
        actionIcon={
          <IconButton
            className={classes.gridListItemIcon}
            onClick={() => toggleMediaEditForm(item)}
          >
            <Edit />
          </IconButton>
        }
      />
    </>
  );
};

MediaGalleryItem.propTypes = {
  item: PropTypes.object.isRequired,
  toggleMediaEditForm: PropTypes.func.isRequired,
};

export default MediaGalleryItem;
