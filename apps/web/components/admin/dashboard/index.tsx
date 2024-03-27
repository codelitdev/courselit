import { Address, SiteInfo } from "@courselit/common-models";
import { AppDispatch, AppState } from "@courselit/state-management";
import { DASHBOARD_PAGE_HEADER } from "@ui-config/strings";
import { connect } from "react-redux";
import ToDo from "./to-do";
import Metric from "./metric";

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
            <div className="mb-8">
                <ToDo />
            </div>
            <div className="grid xs:grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <Metric title="Revenue" type="purchased" duration="7d" />
                <Metric title="Enrollments" type="enrolled" duration="7d" />
                <Metric
                    title="New accounts"
                    type="user_created"
                    duration="7d"
                />
                <Metric
                    title="Subscribers"
                    type="newsletter_subscribed"
                    duration="7d"
                />
            </div>
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
