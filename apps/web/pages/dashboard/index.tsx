import { CREATOR_AREA_PAGE_TITLE } from "@ui-config/strings";
import dynamic from "next/dynamic";

const BaseLayout = dynamic(() => import("../../components/admin/base-layout"));
const Dashboard = dynamic(() => import("../../components/admin/dashboard"));

export default function DashboardPage() {
    return (
        <BaseLayout title={CREATOR_AREA_PAGE_TITLE}>
            <Dashboard />
        </BaseLayout>
    );
}
