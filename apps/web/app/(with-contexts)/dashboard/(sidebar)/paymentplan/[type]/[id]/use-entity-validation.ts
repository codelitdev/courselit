import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Constants, MembershipEntityType } from "@courselit/common-models";
import { useCommunity } from "@/hooks/use-community";
import useProduct from "@/hooks/use-product";

const { MembershipEntityType: membershipEntityType } = Constants;

export function useEntityValidation(
    entityType: MembershipEntityType,
    entityId: string,
) {
    const router = useRouter();

    const { community, loaded: communityLoaded } = useCommunity(
        entityType === membershipEntityType.COMMUNITY ? entityId : null,
    );
    const { product, loaded: productLoaded } = useProduct(
        entityType === membershipEntityType.COURSE ? entityId : null,
    );

    // Redirect if community is not found
    useEffect(() => {
        if (
            entityType === membershipEntityType.COMMUNITY &&
            communityLoaded &&
            !community
        ) {
            router.push("/dashboard/communities");
        }
    }, [communityLoaded, community, entityType, router]);

    // Redirect if product is not found
    useEffect(() => {
        if (
            entityType === membershipEntityType.COURSE &&
            productLoaded &&
            !product
        ) {
            router.push("/dashboard/products");
        }
    }, [productLoaded, product, entityType, router]);

    return {
        loaded:
            entityType === membershipEntityType.COMMUNITY
                ? communityLoaded
                : productLoaded,
        community,
        product,
    };
}
