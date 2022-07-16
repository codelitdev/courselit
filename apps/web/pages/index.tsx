import { connect } from "react-redux";
import { HEADER_BLOG_POSTS_SECTION, BTN_VIEW_ALL } from "../ui-config/strings";
import { Button, Grid, Typography } from "@mui/material";
import Link from "next/link";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import dynamic from "next/dynamic";
import { Section } from "@courselit/components-library";
import type { SiteInfo, State, Page } from "@courselit/common-models";
import MuiLink from "@mui/material/Link";
import BaseLayout from "../components/public/base-layout";

const Items = dynamic(() => import("../components/public/items"));

interface IndexProps {
    siteinfo: SiteInfo;
    page: Page;
}

const Index = ({ siteinfo, page }: IndexProps) => {
    return (
        <BaseLayout title={siteinfo.subtitle} layout={page.layout}>
            <Grid container sx={{ p: 2, minHeight: "80vh" }}>
                {/* {props.courses.length > 0 && (
                    <Section>
                        <Grid
                            container
                            sx={{
                                padding: 2,
                            }}
                        >
                            <Grid
                                item
                                xs={12}
                                sx={{
                                    mb: 2,
                                }}
                            >
                                <Typography variant="h2">
                                    {HEADER_BLOG_POSTS_SECTION}
                                </Typography>
                            </Grid>
                            <Items
                                generateQuery={generateQuery}
                                initialItems={props.courses}
                                posts={true}
                            />
                            <Grid item xs={12}>
                                <Button variant="outlined">
                                    <Link href="/posts">
                                        <MuiLink
                                            sx={{
                                                textDecoration: "none",
                                                color: "inherit",
                                            }}
                                        >
                                            {BTN_VIEW_ALL}
                                        </MuiLink>
                                    </Link>
                                </Button>
                            </Grid>
                        </Grid>
                    </Section>
                )} */}
            </Grid>
        </BaseLayout>
    );
};

const mapStateToProps = (state: State) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Index);

export async function getServerSideProps(context: any) {
    const { req } = context;
    const address = getBackendAddress(req.headers.host);
    const page = await getPage(address, "landing");
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}
