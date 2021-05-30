import BaseLayout from "../components/Public/BaseLayout";
import { Section } from "@courselit/components-library";
import { Typography } from "@material-ui/core";
import { PAGE_TITLE_404 } from "../config/strings";

export default function Custom404() {
    return (
        <BaseLayout title={PAGE_TITLE_404}>
            <Section>
                <Typography variant="h1">
                    {PAGE_TITLE_404}
                </Typography>
            </Section>
        </BaseLayout>
    )
}