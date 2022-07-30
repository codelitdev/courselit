import BaseLayout from "../components/public/base-layout";
import { Grid, Typography } from "@mui/material";
import { PAGE_TITLE_404 } from "../ui-config/strings";
import { getPage } from "../ui-lib/utils";
import { Address } from "@courselit/common-models";
import { useEffect, useState } from "react";
import { AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { HeartBroken } from "@mui/icons-material";

function Custom404({ address }: { address: Address }) {
    const [layout, setLayout] = useState([]);

    useEffect(() => {
        loadPage();
    }, []);
    const loadPage = async () => {
        const page = await getPage(`${address.backend}`);
        if (page) {
            setLayout(page.layout);
        }
    };

    return (
        <BaseLayout title={PAGE_TITLE_404} layout={layout}>
            <Grid
                container
                sx={{
                    padding: 2,
                    minHeight: "80vh",
                }}
                direction="column"
                alignItems="center"
                justifyContent="center"
            >
                <Grid item>
                    <HeartBroken />
                </Grid>
                <Grid item>
                    <Typography variant="h4">{PAGE_TITLE_404}</Typography>
                </Grid>
            </Grid>
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

export default connect(mapStateToProps)(Custom404);
