import { FormEvent, useContext, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Constants, Membership, PaymentPlan } from "@courselit/common-models";
import {
    CircularProgress,
    Form,
    FormField,
    getSymbolFromCurrency,
    Link,
    useToast,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import { TOAST_TITLE_ERROR, TOAST_TITLE_SUCCESS } from "@ui-config/strings";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { Clock } from "@courselit/icons";
import { AlertCircle } from "lucide-react";
import { getPlanPrice } from "@ui-lib/utils";

export default function MembershipStatus({
    id,
    membership,
    joiningReasonText,
    paymentPlan,
}: {
    id: string;
    membership?: Pick<Membership, "status" | "rejectionReason" | "role">;
    joiningReasonText?: string;
    paymentPlan: PaymentPlan;
}) {
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [joiningReason, setJoiningReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [innerStatus, setInnerStatus] = useState(membership?.status);
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const { toast } = useToast();
    const { profile } = useContext(ProfileContext);
    const { amount, period } = getPlanPrice(paymentPlan);
    const currencySymbol =
        getSymbolFromCurrency(siteinfo.currencyISOCode || "USD") || "$";

    const handleJoinSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const query = `
            mutation JoinCommunity(
                $id: String!
                $joiningReason: String!
            ) {
                status: joinCommunity(
                    id: $id
                    joiningReason: $joiningReason
                ) 
            }
        `;
        try {
            setLoading(true);
            const fetchRequest = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                        joiningReason,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            const response = await fetchRequest.exec();
            if (response.status) {
                setIsJoinDialogOpen(false);
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: `Your request to join has been sent.`,
                });
                setInnerStatus(response.status);
            } else {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: response.error,
                });
            }
        } catch (error) {
            console.error("Error updating community:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!membership) {
        return null;
    }

    return (
        <div>
            {innerStatus?.toLowerCase() ===
                Constants.MembershipStatus.PENDING && (
                <Alert>
                    <Clock className="w-4 h-4" />
                    <AlertTitle className="font-semibold">
                        Membership {innerStatus?.toLowerCase()}
                    </AlertTitle>
                </Alert>
            )}
            {innerStatus?.toLowerCase() ===
                Constants.MembershipStatus.REJECTED && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">
                        Membership {innerStatus?.toLowerCase()}
                    </AlertTitle>
                    <AlertDescription>
                        Reason: {membership && membership.rejectionReason}
                    </AlertDescription>
                </Alert>
            )}
            {!profile.name && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">
                        Incomplete Profile
                    </AlertTitle>
                    <AlertDescription>
                        Complete your{" "}
                        <span className="underline">
                            <Link href={"/dashboard/profile"}>profile</Link>
                        </span>{" "}
                        to join this community or post here
                    </AlertDescription>
                </Alert>
            )}
            {!innerStatus && profile.name && (
                <>
                    {amount > 0 && (
                        <Link
                            href={`/checkout?id=${id}&type=${Constants.MembershipEntityType.COMMUNITY}`}
                        >
                            <Button>
                                Join {currencySymbol}
                                {amount} {period}
                            </Button>
                        </Link>
                    )}
                    {amount <= 0 && (
                        <Dialog
                            open={isJoinDialogOpen}
                            onOpenChange={setIsJoinDialogOpen}
                        >
                            <DialogTrigger asChild>
                                <Button>
                                    Join {currencySymbol}
                                    {amount} {period}
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <Form onSubmit={handleJoinSubmit}>
                                    <div className="space-y-4 mt-4">
                                        <FormField
                                            label={
                                                joiningReasonText ||
                                                "Why do you want to join this community?"
                                            }
                                            value={joiningReason}
                                            onChange={(e) =>
                                                setJoiningReason(e.target.value)
                                            }
                                            placeholder="Reason to join"
                                            required
                                        />
                                        <Button
                                            type="submit"
                                            disabled={loading}
                                        >
                                            {loading && <CircularProgress />}
                                            Submit
                                        </Button>
                                    </div>
                                </Form>
                            </DialogContent>
                        </Dialog>
                    )}
                </>
            )}
        </div>
    );
}
