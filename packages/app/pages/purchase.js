import { PURCHASE_STATUS_PAGE_HEADER } from "../config/strings.js";
import dynamic from "next/dynamic";
import { Grid } from "@material-ui/core";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const PurchaseStatus = dynamic(() =>
  import("../components/Public/PurchaseStatus")
);

const Purchase = (props) => {
  return (
    <BaseLayout title={PURCHASE_STATUS_PAGE_HEADER}>
      <Grid item xs={12}>
        <PurchaseStatus />
      </Grid>
    </BaseLayout>
  );
};

export default Purchase;
