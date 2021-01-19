import React, { useState } from "react";
import PropTypes from "prop-types";
import { injectStripe, CardElement } from "react-stripe-elements";
import { Button, Grid } from "@material-ui/core";
import { PAYMENT_MODAL_PAY_NOW_BUTTON_CAPTION } from "../../../config/strings.js";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  // cardElement: {
  //   base: {
  //     color: '#303238',
  //     fontSize: '16px',
  //     fontFamily: '"Open Sans", sans-serif',
  //     fontSmoothing: 'antialiased',
  //     '::placeholder': {
  //       color: '#CFD7DF',
  //     },
  //     margin: theme.spacing(1, 0),
  //     textAlign: 'center'
  //   },
  //   invalid: {
  //     color: '#e5424d',
  //     ':focus': {
  //       color: '#303238',
  //     },
  //   },
  // },
  payButtonContainer: {
    textAlign: "right",
  },
  payButton: {
    margin: theme.spacing(1, 0),
  },
  cardElement: {
    margin: theme.spacing(1, 0),
    textAlign: "center",
  },
}));

const CheckoutForm = (props) => {
  const { stripe, elements } = props;
  const [loading, setLoading] = useState(false);
  const classes = useStyles();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const cardElement = elements.getElement("card");
    const { paymentIntent, error } = await stripe.confirmCardPayment(
      props.clientSecret,
      {
        payment_method: {
          card: cardElement,
        },
      }
    );

    setLoading(false);
    if (paymentIntent && paymentIntent.status === "succeeded") {
      cardElement.clear();
      props.onSuccess();
    } else if (error) {
      props.onError(new Error(error.message));
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Grid container justify="center" direction="column">
        <Grid item xs>
          <CardElement className={classes.cardElement} />
        </Grid>
        <Grid item xs className={classes.payButtonContainer}>
          <Button
            variant="contained"
            color="secondary"
            type="submit"
            className={classes.payButton}
            disabled={loading}
          >
            {PAYMENT_MODAL_PAY_NOW_BUTTON_CAPTION}
          </Button>
        </Grid>
      </Grid>
    </form>
  );
};

CheckoutForm.propTypes = {
  clientSecret: PropTypes.string.isRequired,
  onSuccess: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  stripe: PropTypes.object,
  elements: PropTypes.object,
};

export default injectStripe(CheckoutForm);
