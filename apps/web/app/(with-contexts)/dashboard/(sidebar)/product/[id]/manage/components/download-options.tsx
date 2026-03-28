"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import { Constants } from "@courselit/common-models";
import { COURSE_TYPE_DOWNLOAD } from "@ui-config/constants";
import {
    APP_MESSAGE_COURSE_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";
import { AlertCircle } from "lucide-react";

const { PaymentPlanType: paymentPlanType } = Constants;

const MUTATION_UPDATE_LEAD_MAGNET = `
    mutation UpdateLeadMagnet($courseId: String!, $leadMagnet: Boolean!) {
        updateCourse(courseData: { id: $courseId, leadMagnet: $leadMagnet }) {
            courseId
        }
    }
`;

interface DownloadOptionsProps {
    product: any;
    paymentPlans: any[];
}

export default function DownloadOptions({
    product,
    paymentPlans,
}: DownloadOptionsProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [leadMagnet, setLeadMagnet] = useState(product?.leadMagnet || false);

    const handleSwitchChange = async () => {
        const newValue = !leadMagnet;
        const previousValue = leadMagnet;
        setLeadMagnet(newValue);

        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_LEAD_MAGNET,
                    variables: {
                        courseId: product.courseId,
                        leadMagnet: newValue,
                    },
                })
                .build()
                .exec();

            if (response?.updateCourse) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            // Revert to previous state on error
            setLeadMagnet(previousValue);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Only show for download type products
    if (product?.type?.toLowerCase() !== COURSE_TYPE_DOWNLOAD) {
        return null;
    }

    const hasExactlyOneFreePlan =
        paymentPlans.length === 1 &&
        paymentPlans.some((plan) => plan.type === paymentPlanType.FREE);
    const isSwitchDisabled = loading || !hasExactlyOneFreePlan;

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                    <Label
                        className={`${!hasExactlyOneFreePlan ? "text-muted-foreground" : ""} text-base font-semibold`}
                    >
                        Lead Magnet
                    </Label>
                    <p className="text-sm text-muted-foreground">
                        Send the product to user for free in exchange of their
                        email address
                    </p>
                    {!hasExactlyOneFreePlan && (
                        <div className="flex items-start gap-2 text-red-600">
                            <AlertCircle className="h-4 w-4 mt-0.5 text-red-600" />
                            <p className="text-xs leading-5">
                                Product must have exactly one free payment plan
                                to enable lead magnet
                            </p>
                        </div>
                    )}
                </div>
                <div>
                    <Switch
                        checked={leadMagnet}
                        disabled={isSwitchDisabled}
                        onCheckedChange={handleSwitchChange}
                    />
                </div>
            </div>
            <Separator />
        </div>
    );
}
