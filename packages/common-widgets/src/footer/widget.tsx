import * as React from "react";
import { WidgetProps } from "@courselit/common-models";
import { Grid, Typography } from "@mui/material";
import { Link } from "@courselit/components-library";
import Settings from "./settings";

const Widget = ({
    settings: { backgroundColor, textColor },
    state,
}: WidgetProps<Settings>) => {
    const linkProps = {
        color: textColor || "inherit",
        textDecoration: "none",
    };

    return (
        <Grid
            container
            sx={{
                p: 2,
                backgroundColor: backgroundColor || "#eee",
                color: textColor || "inherit",
            }}
        >
            <Grid item xs={12} md={6}>
                <Typography variant="body1">
                    © {state.siteinfo.title} {new Date().getFullYear()}
                </Typography>
            </Grid>
            <Grid item xs={12} md={6}>
                <Grid container direction="column" alignItems="flex-end">
                    <Grid item>
                        <Link href="/p/terms" sxProps={linkProps}>
                            Terms of Use
                        </Link>
                    </Grid>
                    <Grid item>
                        <Link href="/p/privacy" sxProps={linkProps}>
                            Privacy Policy
                        </Link>
                    </Grid>
                </Grid>
            </Grid>
        </Grid>
    );
};

export default Widget;
