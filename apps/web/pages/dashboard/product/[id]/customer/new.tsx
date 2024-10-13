"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/router";
import { PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER } from "@ui-config/strings";
import { AppDispatch, AppState } from "@courselit/state-management";
import { connect } from "react-redux";
import { Address } from "@courselit/common-models";

const BaseLayout = dynamic(() => import("@components/admin/base-layout"));

const NewCustomer = dynamic(
    () => import("@components/admin/products/new-customer"),
);

function New({
    address,
    dispatch,
}: {
    address: Address;
    dispatch: AppDispatch;
}) {
    const router = useRouter();
    const { id } = router.query;
    return (
        <BaseLayout title={PRODUCT_TABLE_CONTEXT_MENU_INVITE_A_CUSTOMER}>
            <NewCustomer
                courseId={id as string}
                prefix="/dashboard"
                address={address}
                dispatch={dispatch}
            />
        </BaseLayout>
    );
}

const mapStateToProps = (state: AppState) => ({
    address: state.address,
});

const mapDispatchToProps = (dispatch: AppDispatch) => ({ dispatch });

export default connect(mapStateToProps, mapDispatchToProps)(New);
