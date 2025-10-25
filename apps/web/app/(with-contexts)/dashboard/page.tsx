import { redirect } from "next/navigation";
import { getProfile } from "../action";
import { Profile } from "@courselit/common-models";
import { checkPermission } from "@courselit/utils";
import { ADMIN_PERMISSIONS } from "@ui-config/constants";

export default async function Page() {
    const profile = (await getProfile()) as Profile;
    if (checkPermission(profile.permissions, ADMIN_PERMISSIONS)) {
        redirect("/dashboard/overview");
    } else {
        redirect("/dashboard/my-content");
    }

    return null;
}
