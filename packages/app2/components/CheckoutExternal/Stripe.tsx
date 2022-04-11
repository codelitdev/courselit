import React from "react";
import { Button } from "@mui/material";
import { loadStripe } from "@stripe/stripe-js";
import { ENROLL_BUTTON_TEXT } from "../../ui-config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import type { AppState } from "@courselit/state-management";
import type { Address, Auth, Course, SiteInfo } from "@courselit/common-models";
import { FetchBuilder } from "@courselit/utils";

interface StripeProps {
  course: Course;
  siteInfo: SiteInfo;
  auth: Auth;
  address: Address;
};

const Stripe = (props: StripeProps) => {
  const { course, siteInfo, auth, address } = props;
  const stripePromise = loadStripe(siteInfo.stripePublishableKey as string);
  const router = useRouter();

  const handleClick = async () => {
      const fetch = new FetchBuilder()
        .setUrl(`${address.backend}/payment/initiate`)
        .setPayload(getFormData())
        .build();

    try {
        const response = await fetch.exec();
        await redirectToStripeCheckout({
            stripe: await stripePromise,
            sessionId: response.paymentTracker,
        });
    } catch (err) {}
  };

  const getFormData = () => {
    const formData = new window.FormData();
    formData.append("courseid", course.courseId);
    formData.append(
      "metadata",
      JSON.stringify({
        cancelUrl: `${address.frontend}${router.asPath}`,
        successUrl: `${address.frontend}/purchase`,
        sourceUrl: router.asPath,
      })
    );
    return formData;
  }

  const redirectToStripeCheckout = async ({ stripe, sessionId }: { stripe: any, sessionId: string }) => {
    const result = await stripe.redirectToCheckout({
      sessionId,
    });
    if (result.error) {
    }
  };

  return (
    <Button
      onClick={handleClick}
      variant="outlined"
      color="primary"
      size="large"
    >
      {ENROLL_BUTTON_TEXT}
    </Button>
  );
};

const mapStateToProps = (state: AppState) => ({
  siteInfo: state.siteinfo,
  auth: state.auth,
  address: state.address,
});

export default connect(mapStateToProps)(Stripe);
