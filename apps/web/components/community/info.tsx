import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
    Constants,
    Membership,
    PaymentPlan,
    UIConstants,
} from "@courselit/common-models";
import { FormEvent, Fragment, useContext, useState } from "react";
import { getPlanPrice, hasCommunityPermission } from "@ui-lib/utils";
import {
    Form,
    FormField,
    getSymbolFromCurrency,
    Link,
    TextRenderer,
    useToast,
} from "@courselit/components-library";
import {
    AddressContext,
    ProfileContext,
    SiteInfoContext,
} from "@components/contexts";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@components/ui/dialog";
import { COMMUNITY_SETTINGS, TOAST_TITLE_SUCCESS } from "@ui-config/strings";
import { Share2 } from "lucide-react";
const { permissions } = UIConstants;

interface CommunityInfoProps {
    id: string;
    name: string;
    description: Record<string, unknown>;
    image: string;
    memberCount: number;
    paymentPlan: PaymentPlan;
    joiningReasonText?: string;
    pageId: string;
    onJoin: (joiningReason?: string) => void;
    onLeave: () => void;
    membership?: Pick<Membership, "status" | "rejectionReason" | "role">;
}

export function CommunityInfo({
    id,
    name,
    description,
    image,
    memberCount,
    membership,
    paymentPlan,
    joiningReasonText,
    pageId,
    onJoin,
    onLeave,
}: CommunityInfoProps) {
    const [showLeaveConfirmation, setShowLeaveConfirmation] = useState(false);
    const [isJoinDialogOpen, setIsJoinDialogOpen] = useState(false);
    const [joiningReason, setJoiningReason] = useState("");
    const { amount, period } = getPlanPrice(paymentPlan);
    const address = useContext(AddressContext);
    const siteinfo = useContext(SiteInfoContext);
    const { profile } = useContext(ProfileContext);
    const currencySymbol =
        getSymbolFromCurrency(siteinfo.currencyISOCode || "USD") || "$";
    const { toast } = useToast();

    const handleJoinSubmit = async (e: FormEvent) => {
        e.preventDefault();
        onJoin(joiningReason);
    };

    const handleLeaveClick = () => {
        setShowLeaveConfirmation(true);
    };

    const handleConfirmLeave = () => {
        onLeave();
        setShowLeaveConfirmation(false);
    };

    const handleShareClick = () => {
        navigator.clipboard.writeText(`${address.frontend}/p/${pageId}`);
        toast({
            title: TOAST_TITLE_SUCCESS,
            description: "Page URL copied to clipboard!",
        });
    };

    return (
        <Card>
            <CardHeader className="flex justify-between items-center w-full">
                <CardTitle className="w-full">
                    <div class="flex justify-between items-center w-full">
                        <p>{name}</p>
                        <Button variant="ghost" onClick={handleShareClick}>
                            <Share2 className="h-5 w-5" />
                        </Button>
                    </div>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <img
                    src={image}
                    alt={`${name} community`}
                    className="w-full aspect-video object-cover rounded-lg"
                />
                <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                        {description && <TextRenderer json={description} />}
                    </p>
                    <p className="text-sm">
                        <strong>{memberCount.toLocaleString()}</strong> members
                    </p>
                </div>
                {!membership && (
                    <Fragment>
                        {amount > 0 && (
                            <Link
                                href={`/checkout?id=${id}&type=${Constants.MembershipEntityType.COMMUNITY}`}
                                className="w-full"
                            >
                                <Button className="w-full">
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
                                    <Button className="w-full">
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
                                                    setJoiningReason(
                                                        e.target.value,
                                                    )
                                                }
                                                placeholder="Reason to join"
                                                required
                                            />
                                            <Button type="submit">
                                                Submit
                                            </Button>
                                        </div>
                                    </Form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </Fragment>
                )}
                {membership &&
                    membership.status === Constants.MembershipStatus.ACTIVE && (
                        <>
                            <Button
                                onClick={handleLeaveClick}
                                variant="outline"
                                className="w-full"
                            >
                                Leave Community
                            </Button>
                            <Dialog
                                open={showLeaveConfirmation}
                                onOpenChange={setShowLeaveConfirmation}
                            >
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            Leave Community
                                        </DialogTitle>
                                        <DialogDescription>
                                            Are you sure you want to leave this
                                            community? <br></br> <br></br>
                                            You’ll lose access to all community
                                            content and discussions, and any
                                            ongoing subscription will be
                                            canceled.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <DialogFooter>
                                        <Button
                                            variant="secondary"
                                            onClick={() =>
                                                setShowLeaveConfirmation(false)
                                            }
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            variant="destructive"
                                            onClick={handleConfirmLeave}
                                        >
                                            Leave Community
                                        </Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>
                        </>
                    )}
                {membership &&
                    membership.status ===
                        Constants.MembershipStatus.PENDING && (
                        <Button disabled className="w-full">
                            Membership Pending
                        </Button>
                    )}
                {membership &&
                    membership.status ===
                        Constants.MembershipStatus.REJECTED && (
                        <>
                            <Button disabled className="w-full">
                                Membership Rejected
                            </Button>
                            {membership.rejectionReason && (
                                <Alert variant="destructive">
                                    <AlertDescription>
                                        <b>Rejection reason</b>:{" "}
                                        {membership.rejectionReason}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </>
                    )}
                {membership &&
                    hasCommunityPermission(
                        membership,
                        Constants.MembershipRole.MODERATE,
                    ) &&
                    membership.status === Constants.MembershipStatus.ACTIVE && (
                        <Link href={`/dashboard/community/${id}/manage`}>
                            <Button variant="outline" className="w-full mt-2">
                                {COMMUNITY_SETTINGS}
                            </Button>
                        </Link>
                    )}
            </CardContent>
        </Card>
    );
}
