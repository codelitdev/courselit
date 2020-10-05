import BaseLayout from "../components/Public/BaseLayout";
import PurchaseStatus from "../components/Public/PurchaseStatus";
import { PURCHASE_STATUS_PAGE_HEADER } from "../config/strings.js";

const Payment = (props) => {
  return (
    <BaseLayout title={PURCHASE_STATUS_PAGE_HEADER}>
      <PurchaseStatus />
    </BaseLayout>
  );
};

export default Payment;
