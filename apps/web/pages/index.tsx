import { connect } from "react-redux";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import type { SiteInfo, State, Page, Typeface } from "@courselit/common-models";
import BaseLayout from "../components/public/base-layout";

interface IndexProps {
    siteinfo: SiteInfo;
    page: Page;
    typefaces: Typeface[];
}

const Index = ({ siteinfo, page, typefaces }: IndexProps) => {
    return (
        <BaseLayout title={siteinfo.subtitle} layout={page.layout}></BaseLayout>
    );
};

const mapStateToProps = (state: State) => ({
    siteinfo: state.siteinfo,
    typefaces: state.typefaces,
});

export default connect(mapStateToProps)(Index);

export async function getServerSideProps(context: any) {
    const { req } = context;
    const address = getBackendAddress(req.headers);
    const page = await getPage(address, "homepage");
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}
