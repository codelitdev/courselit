import { connect } from "react-redux";
import { getBackendAddress, getPage } from "../../ui-lib/utils";
import type { SiteInfo, State, Page } from "@courselit/common-models";
import BaseLayout from "../../components/public/base-layout";

interface IndexProps {
    siteinfo: SiteInfo;
    page: Page;
}

const Index = ({ page, siteinfo }: IndexProps) => {
    return (
        <BaseLayout
            title={page.title}
            layout={page.layout}
            pageData={page.pageData}
            description={page.description || siteinfo.subtitle}
            socialImage={page.socialImage}
            robotsAllowed={page.robotsAllowed}
        />
    );
};

const mapStateToProps = (state: State) => ({
    siteinfo: state.siteinfo,
});

export default connect(mapStateToProps)(Index);

export async function getServerSideProps({ query, req }: any) {
    const { id } = query;
    const address = getBackendAddress(req.headers);
    const page = await getPage(address, id);
    if (!page) {
        return {
            notFound: true,
        };
    }
    return { props: { page } };
}
