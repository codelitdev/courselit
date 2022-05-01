import { PURCHASE_STATUS_PAGE_HEADER } from "../ui-config/strings";
import dynamic from "next/dynamic";
import { Grid } from "@mui/material";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const PurchaseStatus = dynamic(
  () => import("../components/Public/PurchaseStatus")
);

const Purchase = (props: unknown) => {
  return (
    <BaseLayout title={PURCHASE_STATUS_PAGE_HEADER}>
      <Grid item xs={12}>
        <PurchaseStatus />
      </Grid>
    </BaseLayout>
  );
};

export default Purchase;
