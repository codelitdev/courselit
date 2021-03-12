import { GridListTileBar, IconButton } from "@material-ui/core";
import { Edit } from "@material-ui/icons";
import React, { useState } from "react";
import PropTypes from "prop-types";
import { makeStyles } from "@material-ui/styles";
import { connect } from "react-redux";
import { addressProps } from "../../../types";

const useStyles = makeStyles({
  gridListItemIcon: {
    color: "#fff",
  },
  thumbnail: {
    width: "100%",
    height: "auto",
  },
});

const MediaGalleryItem = ({ item, toggleMediaEditForm, address }) => {
  const [imgSrc, setImgSrc] = useState(
    `${address.backend}/media/${item.id}?thumb=1`
  );
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
  address: addressProps,
};

const mapStateToProps = (state) => ({
  address: state.address,
});

export default connect(mapStateToProps)(MediaGalleryItem);
