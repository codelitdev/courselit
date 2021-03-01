import { connect } from "react-redux";
import BaseLayout from "../../components/Admin/BaseLayout";
import MasterDetails from "../../components/Admin/Widgets";
import { WIDGETS_PAGE_HEADER } from "../../config/strings";
import widgets from "../../config/widgets";

function WidgetsArea({ profile }) {
  const widgetsMap = {};
  if (profile.isAdmin) {
    Object.keys(widgets).map((name) => {
      widgetsMap[widgets[name].metadata.name] = {
        icon: widgets[name].metadata.icon,
        caption: widgets[name].metadata.displayName,
        component: widgets[name].adminWidget,
      };
    });
  }

  return (
    <BaseLayout title={WIDGETS_PAGE_HEADER}>
      <MasterDetails componentsMap={widgetsMap} />
    </BaseLayout>
  );
}

const mapStateToProps = (state) => ({
  profile: state.profile,
});

export default connect(mapStateToProps)(WidgetsArea);
