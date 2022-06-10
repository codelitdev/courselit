import React from "react";
import { styled } from "@mui/system";
import { CircularProgress, Grid, Typography } from "@mui/material";
import { LOADING } from "../ui-config/strings";
const PREFIX = "AppLoader";

const classes = {
    loader: `${PREFIX}-loader`,
};

const StyledGrid = styled(Grid)({
    [`&.${classes.loader}`]: {
        // height: '100%',
        // width: '100%'
    },
});

const AppLoader = (props: unknown) => {
    return (
        <StyledGrid
            container
            direction="column"
            justifyContent="center"
            alignItems="center"
            className={classes.loader}
        >
            <Grid item>
                <CircularProgress />
            </Grid>
            <Grid item>
                <Typography variant="subtitle1">{LOADING}</Typography>
            </Grid>
        </StyledGrid>
    );
};

export default AppLoader;
