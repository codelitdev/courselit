import { useContext, useEffect, useState } from "react";
import { AddressContext } from "@components/contexts";
import { FetchBuilder } from "@courselit/utils";
import { Community } from "@courselit/common-models";

export const useCommunity = (id?: string | null) => {
    const [community, setCommunity] = useState<
        | (Community & {
              banner: any;
              joiningReasonText: string;
          })
        | null
    >(null);
    const address = useContext(AddressContext);
    const [error, setError] = useState<string | null>(null);
    const [loaded, setLoaded] = useState<boolean>(false);

    useEffect(() => {
        if (!id) {
            return;
        }

        const loadCommunity = async () => {
            const query = `
            query ($id: String!) {
                community: getCommunity(id: $id) {
                    communityId
                    name
                    description
                    enabled
                    banner
                    categories
                    autoAcceptMembers
                    joiningReasonText
                    pageId
                    paymentPlans {
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
                        includedProducts
                    }
                    defaultPaymentPlan
                    featuredImage {
                        mediaId
                        originalFileName
                        mimeType
                        size
                        access
                        file
                        thumbnail
                        caption
                    }
                    membersCount
                }
            }
            `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload({ query, variables: { id } })
                .setIsGraphQLEndpoint(true)
                .build();
            try {
                const response = await fetch.exec();
                if (response.community) {
                    setCommunity(response.community);
                }
                if (response.error) {
                    setError(response.error);
                }
            } catch (err: any) {
                setError(err.message);
                // toast({
                //     title: TOAST_TITLE_ERROR,
                //     description: err.message,
                //     variant: "destructive",
                // });
            } finally {
                setLoaded(true);
            }
        };

        loadCommunity();
    }, [address.backend, id]);

    return { community, error, loaded, setCommunity };
};
