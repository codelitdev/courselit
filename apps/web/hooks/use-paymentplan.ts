import { useContext, useEffect, useState } from "react";
import { AddressContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { MembershipEntityType, PaymentPlan } from "@courselit/common-models";
import { TOAST_TITLE_ERROR } from "@ui-config/strings";
import { useToast } from "@courselit/components-library";

export const usePaymentPlan = (
    id?: string | null,
    entityId?: string | null,
    entityType?: MembershipEntityType,
) => {
    const [paymentPlan, setPaymentPlan] = useState<PaymentPlan | null>(null);
    const address = useContext(AddressContext);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);
    const { toast } = useToast();

    useEffect(() => {
        if (!id || !entityId || !entityType) {
            return;
        }

        const loadPaymentPlan = async () => {
            const query = `
            query ($id: String!) {
                paymentPlan: getPaymentPlan(id: $id) {
                    planId
                    name
                    type
                    entityId
                    entityType
                    oneTimeAmount
                    emiAmount
                    emiTotalInstallments
                    subscriptionMonthlyAmount
                    subscriptionYearlyAmount
                    description
                    includedProducts
                }
            }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({
                    query,
                    variables: {
                        id,
                    },
                })
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const response = await fetch.exec();
                if (response.paymentPlan) {
                    setPaymentPlan(response.paymentPlan);
                }
                if (response.error) {
                    setError(response.error);
                }
            } catch (err: any) {
                setError(err.message);
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            } finally {
                setLoaded(true);
            }
        };

        loadPaymentPlan();
    }, [address.backend, id, entityId, entityType]);

    return { paymentPlan, error, loaded, setPaymentPlan };
};
