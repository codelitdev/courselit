import { signOut } from "@/auth";
import { Button } from "@components/ui/button";
import { redirect } from "next/navigation";

export default function Page() {
    return (
        <form
            action={async () => {
                "use server";
                await signOut();
                redirect("/");
            }}
        >
            <Button type="submit">Logout</Button>
        </form>
    );
}
