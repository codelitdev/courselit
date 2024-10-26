import { redirect } from "next/navigation";

const breadcrumbs = [
    {
        label: "Build your application",
        href: "#",
    },
    {
        label: "Data fetching",
        href: "#",
    },
];

export default function Page() {
    redirect("/dashboard4/my-content");

    return <></>;
}
