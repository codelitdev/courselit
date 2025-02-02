import { redirect } from "next/navigation";

export default function Page() {
    redirect("/dashboard/my-content");

    return <></>;
}
