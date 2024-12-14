import { FormEvent, useContext, useState } from "react";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CommunityMemberStatus, Constants } from "@courselit/common-models";
import {
    CircularProgress,
    Form,
    FormField,
    Link,
    useToast,
} from "@courselit/components-library";
import { FetchBuilder } from "@courselit/utils";
import { AddressContext, ProfileContext } from "@components/contexts";
import { TOAST_TITLE_ERROR, TOAST_TITLE_SUCCESS } from "@ui-config/strings";
import { Alert, AlertDescription, AlertTitle } from "@components/ui/alert";
import { Clock } from "@courselit/icons";
import { AlertCircle } from "lucide-react";

export default function MembershipStatus({
    id,
    status,
    rejectionReason,
    joiningReasonText,
}: {
    id: string;
    status?: CommunityMemberStatus;
    rejectionReason?: string;
    joiningReasonText?: string;
}) {
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [joiningReason, setJoiningReason] = useState("");
    const [loading, setLoading] = useState(false);
    const [innerStatus, setInnerStatus] = useState(status);
    const address = useContext(AddressContext);
    const { toast } = useToast();
    const { profile } = useContext(ProfileContext);

    const handleJoinSubmit = async (e: FormEvent) => {
        // Handle join request submission
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

    return (
        <div>
            {innerStatus?.toLowerCase() ===
                Constants.communityMemberStatus[0] && (
                <Alert>
                    <Clock className="w-4 h-4" />
                    <AlertTitle className="font-semibold">
                        Membership {innerStatus?.toLowerCase()}
                    </AlertTitle>
                </Alert>
            )}
            {innerStatus?.toLowerCase() ===
                Constants.communityMemberStatus[1] && (
                <div>
                    <p>You are a member of this community.</p>
                    <button>Leave Community</button>
                </div>
            )}
            {innerStatus?.toLowerCase() ===
                Constants.communityMemberStatus[2] && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">
                        Membership {innerStatus?.toLowerCase()}
                    </AlertTitle>
                    <AlertDescription>
                        Reason: {rejectionReason}
                    </AlertDescription>
                </Alert>
            )}
            {!innerStatus && !profile.name && (
                <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle className="font-semibold">
                        Incomplete Profile
                    </AlertTitle>
                    <AlertDescription>
                        Complete your{" "}
                        <span className="underline">
                            <Link href={"/dashboard4/profile"}>profile</Link>
                        </span>{" "}
                        to join this community
                    </AlertDescription>
                </Alert>
            )}
            {!innerStatus && profile.name && (
                <Dialog
                    open={isJoinDialogOpen}
                    onOpenChange={setIsJoinDialogOpen}
                >
                    <DialogTrigger asChild>
                        <Button>Join Community</Button>
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
                                <Button type="submit" disabled={loading}>
                                    {loading && <CircularProgress />}
                                    Submit
                                </Button>
                            </div>
                        </Form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
