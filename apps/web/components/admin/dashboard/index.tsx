import { Address, SiteInfo } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import { DASHBOARD_PAGE_HEADER } from "@ui-config/strings";
import { connect } from "react-redux";
import ToDo from "./to-do";

interface IndexProps {
    dispatch: AppDispatch;
    address: Address;
    loading: boolean;
    siteinfo: SiteInfo;
}

const Index = ({ loading, address, dispatch, siteinfo }: IndexProps) => {
    return (
        <div>
            <h1 className="text-4xl font-semibold mb-8">
                {DASHBOARD_PAGE_HEADER}
            </h1>
            <ToDo />
        </div>
    );
};

const mapStateToProps = (state: AppState) => ({
    address: state.address,
    loading: state.networkAction,
    siteinfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({
    dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Index);
