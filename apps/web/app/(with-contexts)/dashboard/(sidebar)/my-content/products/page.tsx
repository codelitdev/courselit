import { Constants } from "@courselit/common-models";
import MyContentView from "../my-content-view";

export default function Page() {
    return <MyContentView type={Constants.MembershipEntityType.COURSE} />;
}
