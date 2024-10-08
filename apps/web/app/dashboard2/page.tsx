import { redirect } from "next/navigation";

export default function Page() {
    redirect("/dashboard2/my-content");
    return <div></div>;
}
