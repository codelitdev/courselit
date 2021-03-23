import { PURCHASE_STATUS_PAGE_HEADER } from "../config/strings.js";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("../components/Public/BaseLayout"));
const PurchaseStatus = dynamic(() =>
  import("../components/Public/PurchaseStatus")
);

const Payment = (props) => {
  return (
    <BaseLayout title={PURCHASE_STATUS_PAGE_HEADER}>
      <PurchaseStatus />
    </BaseLayout>
  );
};

export default Payment;
