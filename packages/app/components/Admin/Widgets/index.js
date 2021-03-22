import React, { useEffect, useState } from "react";
import { OverviewAndDetail } from "@courselit/components-library";
import { WIDGETS_PAGE_HEADER } from "../../../config/strings";
import widgets from "../../../config/widgets";
import { addressProps, profileProps } from "../../../types";
import { connect } from "react-redux";
import { GridListTileBar } from "@material-ui/core";
import { useTheme } from "@material-ui/styles";
import FetchBuilder from "../../../lib/fetch";
import dynamic from "next/dynamic";

const Img = dynamic(() => import("../../Img.js"));

function Widgets({ address }) {
  const [componentsMap, setComponentsMap] = useState([]);
  const theme = useTheme();
  const fetch = new FetchBuilder()
    .setUrl(`${address.backend}/graph`)
    .setIsGraphQLEndpoint(true);

  useEffect(() => {
    const map = [];
    Object.values(widgets).map((widget) => {
      Object.prototype.hasOwnProperty.call(widget, "adminWidget") &&
        map.push(getComponent(widget));
    });
    setComponentsMap(map);
  }, []);

  const getComponent = (widget) => {
    const AdminWidget = widget.adminWidget;

    return {
      subtitle: widget.metadata.displayName,
      Overview: (
        <>
          <Img src={widget.metadata.icon} isExternal={true} />
          <GridListTileBar title={widget.metadata.displayName} />
        </>
      ),
      Detail: (
        <AdminWidget
          name={widget.metadata.name}
          fetchBuilder={fetch}
          theme={theme}
        />
      ),
    };
  };

  return (
    <OverviewAndDetail
      title={WIDGETS_PAGE_HEADER}
      componentsMap={componentsMap}
    />
  );
}

Widgets.propTypes = {
  profile: profileProps,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  profile: state.profile,
  address: state.address,
});

export default connect(mapStateToProps)(Widgets);
