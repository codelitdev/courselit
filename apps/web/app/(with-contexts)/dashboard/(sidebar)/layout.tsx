import LayoutWithSidebar from "./layout-with-sidebar";

export default async function Layout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <LayoutWithSidebar>{children}</LayoutWithSidebar>;
}
