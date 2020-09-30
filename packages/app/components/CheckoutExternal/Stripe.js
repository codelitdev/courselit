import { Button } from "@material-ui/core";
import { authProps, publicCourse, siteInfoProps } from "../../types";
import { loadStripe } from '@stripe/stripe-js';
import { ENROLL_BUTTON_TEXT } from "../../config/strings";
import { connect } from "react-redux";
import { BACKEND, FRONTEND } from "../../config/constants";
import { useRouter } from "next/router";

const Stripe = (props) => {
    const { course, siteInfo, auth } = props;
    const stripePromise = loadStripe(siteInfo.stripePublishableKey);
    const router = useRouter();

    const handleClick = async () => {
        let initiatePaymentResponse = await makePaymentRequest({
            courseId: course.id,
            backend: BACKEND,
            token: auth.token,
            frontend: FRONTEND,
            router
        });

        if (initiatePaymentResponse.status === 401) {
            router.push("/login");
            return;
        }

        try {
            initiatePaymentResponse = await initiatePaymentResponse.json();
            console.log(initiatePaymentResponse);
            await redirectToStripeCheckout({
                stripe: await stripePromise,
                sessionId: initiatePaymentResponse.paymentTracker
            });
        } catch (err) {}
    }

    const makePaymentRequest = async ({courseId, backend, token, router, frontend}) => {
        const formData = new window.FormData();
        formData.append("courseid", courseId);
        formData.append("metadata", JSON.stringify({
            cancelUrl: `${frontend}${router.asPath}`,
            successUrl: `${frontend}/success`
        }))
    
        const res = await fetch(`${backend}/payment/initiate`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        return res;
    };

    const redirectToStripeCheckout = async ({stripe, sessionId}) => {
        const result = await stripe.redirectToCheckout({
            sessionId
        });
        if (result.error) {
            console.log(result.error);
        }
    }

    return <Button onClick={handleClick}>{ENROLL_BUTTON_TEXT}</Button>
}

Stripe.propTypes = {
    course: publicCourse.isRequired,
    siteInfo: siteInfoProps,
    auth: authProps
}

const mapStateToProps = (state) => ({
    siteInfo: state.siteinfo,
    auth: state.auth
  });

export default connect(mapStateToProps)(Stripe);