import { connect } from "react-redux";
import Posts from "../components/Public/Posts/List.js";
import BaseLayout from "../components/Public/BaseLayout";

const Index = props => {
  return (
    <BaseLayout title={props.siteinfo.subtitle}>
      <Posts />
    </BaseLayout>
  );
};

const mapStateToProps = state => ({
  siteinfo: state.siteinfo
});

export default connect(mapStateToProps)(Index);
