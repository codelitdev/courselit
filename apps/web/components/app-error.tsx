import React from "react";
import { styled } from "@mui/system";
import { Typography, Grid } from "@mui/material";
import { USER_ERROR_HEADER } from "../ui-config/strings";
import { Section } from "@courselit/components-library";
import BaseLayout from "./public/base-layout";

const PREFIX = "AppError";

const classes = {
    header: `${PREFIX}-header`,
};

const StyledBaseLayout = styled(BaseLayout)(({ theme }: { theme: any }) => ({
    [`& .${classes.header}`]: {
        marginBottom: theme.spacing(1),
    },
}));

interface AppErrorProps {
    error: string;
}

const AppError = (props: AppErrorProps) => {
    const { error } = props;

    return (
        <StyledBaseLayout>
            <Grid container>
                <Grid item>
                    <Section>
                        <Typography
                            variant="body1"
                            color="textSecondary"
                            className={classes.header}
                        >
                            {USER_ERROR_HEADER}
                        </Typography>
                        <Typography variant="h5">{error}</Typography>
                    </Section>
                </Grid>
            </Grid>
        </StyledBaseLayout>
    );
};

export default AppError;
