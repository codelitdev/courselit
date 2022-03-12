import React from "react";
import { styled } from '@mui/material/styles';
import PropTypes from "prop-types";
import { Grid, Typography, IconButton } from "@mui/material";
import { Remove } from "@mui/icons-material";
const PREFIX = 'AddedComponent';

const classes = {
  container: `${PREFIX}-container`
};

const StyledGrid = styled(Grid)((
  {
    theme
  }
) => ({
  [`&.${classes.container}`]: {
    padding: theme.spacing(1),
    border: "1px solid #eee",
  }
}));

const AddedComponent = (props) => {


  return (
    <StyledGrid
      container
      item
      direction="row"
      alignItems="center"
      justifyContent="space-between"
      className={classes.container}
    >
      <Grid item>
        <Typography variant="caption">{props.title}</Typography>
      </Grid>
      <Grid item>
        <IconButton
          color="default"
          aria-label="remove component"
          onClick={() => props.removeComponent(props.section, props.index)}
          size="large">
          <Remove />
        </IconButton>
      </Grid>
    </StyledGrid>
  );
};

AddedComponent.propTypes = {
  section: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  index: PropTypes.number.isRequired,
  removeComponent: PropTypes.func.isRequired,
};

export default AddedComponent;
