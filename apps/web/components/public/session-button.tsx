import React from "react";
import {
    GENERIC_SIGNOUT_TEXT,
    GENERIC_SIGNIN_TEXT,
} from "../../ui-config/strings";
import { Button } from "@courselit/components-library";
import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function SessionButton() {
    const { data: session } = authClient.useSession();
    const router = useRouter();

    if (session) {
        return (
            <Button
                onClick={async () => {
                    await authClient.signOut();
                    router.refresh();
                }}
                component="button"
            >
                {GENERIC_SIGNOUT_TEXT}
            </Button>
        );
    }

    return (
        <Button onClick={() => router.push("/login")} component="button">
            {GENERIC_SIGNIN_TEXT}
        </Button>
    );
}
