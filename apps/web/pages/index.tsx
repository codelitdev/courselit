import { connect } from "react-redux";
import { getBackendAddress, getPage } from "../ui-lib/utils";
import { type SiteInfo, type State, type Page } from "@courselit/common-models";
import BaseLayout from "../components/public/base-layout";

interface IndexProps {
    siteinfo: SiteInfo;
    page: Page;
}

const Index = ({ siteinfo, page }: IndexProps) => {
    return (
        <BaseLayout
            title={page.title}
            layout={page.layout}
            description={page.description || siteinfo.subtitle}
            socialImage={page.socialImage}
            robotsAllowed={page.robotsAllowed}
        />
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
