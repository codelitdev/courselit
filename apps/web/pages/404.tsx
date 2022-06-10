import BaseLayout from "../components/public/base-layout";
import { Section } from "@courselit/components-library";
import { Grid, Typography } from "@mui/material";
import { PAGE_TITLE_404 } from "../ui-config/strings";

export default function Custom404() {
    return (
        <BaseLayout title={PAGE_TITLE_404}>
            <Grid item>
                <Section>
                    <Grid
                        container
                        sx={{
                            padding: 2,
                        }}
                    >
                        <Grid item>
                            <Typography variant="h1">
                                {PAGE_TITLE_404}
                            </Typography>
                        </Grid>
                    </Grid>
                </Section>
            </Grid>
        </BaseLayout>
    );
}
