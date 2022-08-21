import React from "react";
import { Typography, Grid } from "@mui/material";
import { USER_ERROR_HEADER } from "../ui-config/strings";
import { Section } from "@courselit/components-library";

interface AppErrorProps {
    error: string;
}

const AppError = (props: AppErrorProps) => {
    const { error } = props;

    return (
        <Grid container>
            <Grid item>
                <Section>
                    <Typography variant="body1" color="textSecondary">
                        {USER_ERROR_HEADER}
                    </Typography>
                    <Typography variant="h5">{error}</Typography>
                </Section>
            </Grid>
        </Grid>
    );
};

export default AppError;
