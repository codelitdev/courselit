import React, { useEffect } from "react";
import PropTypes from "prop-types";
import { Elements, StripeProvider } from "react-stripe-elements";
import { connect } from "react-redux";
import { STRIPE_PUBLISHABLE_KEY_EMPTY } from "../../../config/strings.js";
import CheckoutForm from "./CheckoutForm.js";
import { Button, Typography } from "@material-ui/core";
import { siteInfoProps } from "../../../types.js";
import { loadStripe } from '@stripe/stripe-js'

const Stripe = (props) => {
  const { siteInfo, sessionId } = props;
  // const [stripe] = useState(window.Stripe('pk_test_TPqKXuR984C65Bb7yWdnkAnT'))
  const stripePromise = loadStripe(siteInfo.stripePublishableKey);

  const handleClick = async () => {
    const stripe = await stripePromise;
    const result = await stripe.redirectToCheckout({
      sessionId
    });
    if (result.error) {
      console.log(result.error);
    }
  }

  return (
    <>
      {siteInfo.stripePublishableKey && (
        // <StripeProvider stripe={window.Stripe(siteInfo.stripePublishableKey)}>
        //   <Elements>
        //     <CheckoutForm
        //       clientSecret={props.clientSecret}
        //       onSuccess={props.onSuccess}
        //       onError={props.onError}
        //     />
        //   </Elements>
        // </StripeProvider>
        <Button role="link" onClick={handleClick}>
          Checkout
        </Button>
      )}
      {!siteInfo.stripePublishableKey && (
        <Typography variant="subtitle1">
          {STRIPE_PUBLISHABLE_KEY_EMPTY}
        </Typography>
      )}
    </>
  );
};

Stripe.propTypes = {
  sessionId: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  siteInfo: siteInfoProps,
};

const mapStateToProps = (state) => ({
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(Stripe);
