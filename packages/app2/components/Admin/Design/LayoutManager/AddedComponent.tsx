import React from "react";
import { styled } from "@mui/material/styles";
import { Grid, Typography, IconButton } from "@mui/material";
import { Remove } from "@mui/icons-material";

const PREFIX = "AddedComponent";

const classes = {
  container: `${PREFIX}-container`,
};

const StyledGrid = styled(Grid)(({ theme }: { theme: any }) => ({
  [`&.${classes.container}`]: {
    padding: theme.spacing(1),
    border: "1px solid #eee",
  },
}));

interface AddedComponentProps {
  section: string;
  title: string;
  index: number;
  removeComponent: (...args: any[]) => void;
}

const AddedComponent = (props: AddedComponentProps) => {
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
          size="large"
        >
          <Remove />
        </IconButton>
      </Grid>
    </StyledGrid>
  );
};

export default AddedComponent;
