import React from "react";
import { Button } from "@material-ui/core";
import {
  addressProps,
  authProps,
  publicCourse,
  siteInfoProps,
} from "../../types";
import { loadStripe } from "@stripe/stripe-js";
import { ENROLL_BUTTON_TEXT } from "../../config/strings";
import { connect } from "react-redux";
import { useRouter } from "next/router";
import fetch from "isomorphic-unfetch";

const Stripe = (props) => {
  const { course, siteInfo, auth, address } = props;
  const stripePromise = loadStripe(siteInfo.stripePublishableKey);
  const router = useRouter();

  const handleClick = async () => {
    let initiatePaymentResponse = await makePaymentRequest({
      courseId: course.id,
      backend: address.backend,
      token: auth.token,
      frontend: address.frontend,
      router,
    });

    if (initiatePaymentResponse.status === 401) {
      router.push(`/login?redirect=${router.asPath}`);
      return;
    }

    try {
      initiatePaymentResponse = await initiatePaymentResponse.json();
      await redirectToStripeCheckout({
        stripe: await stripePromise,
        sessionId: initiatePaymentResponse.paymentTracker,
      });
    } catch (err) {}
  };

  const makePaymentRequest = async ({
    courseId,
    backend,
    token,
    router,
    frontend,
  }) => {
    const formData = new window.FormData();
    formData.append("courseid", courseId);
    formData.append(
      "metadata",
      JSON.stringify({
        cancelUrl: `${frontend}${router.asPath}`,
        successUrl: `${frontend}/purchase`,
        sourceUrl: router.asPath,
      })
    );

    const res = await fetch(`${backend}/payment/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return res;
  };

  const redirectToStripeCheckout = async ({ stripe, sessionId }) => {
    const result = await stripe.redirectToCheckout({
      sessionId,
    });
    if (result.error) {
      // console.log(result.error);
    }
  };

  return (
    <Button onClick={handleClick} variant="contained" color="primary">
      {ENROLL_BUTTON_TEXT}
    </Button>
  );
};

Stripe.propTypes = {
  course: publicCourse.isRequired,
  siteInfo: siteInfoProps,
  auth: authProps,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  siteInfo: state.siteinfo,
  auth: state.auth,
  address: state.address,
});

export default connect(mapStateToProps)(Stripe);
