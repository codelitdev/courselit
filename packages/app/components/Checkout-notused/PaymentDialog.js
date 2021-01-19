import React, { useEffect, useState } from "react";
import { connect } from "react-redux";
import PropTypes from "prop-types";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Typography,
  DialogActions,
  Button,
  CircularProgress,
  Divider,
} from "@material-ui/core";
import {
  CHECKOUT_DIALOG_TITLE,
  PAYMENT_MODAL_PAYMENT_DETAILS_HEADER,
  PAYMENT_VERIFICATION_FAILED,
  CAPTION_TRY_AGAIN,
  CAPTION_CLOSE,
} from "../../config/strings";
import { siteInfoProps, publicCourse, authProps } from "../../types";
import Stripe from "./Stripe";
import {
  PAYMENT_METHOD_STRIPE,
  PAYMENT_METHOD_PAYTM,
  PAYMENT_METHOD_PAYPAL,
  BACKEND,
  TRANSACTION_INITIATED,
  TRANSACTION_SUCCESS,
  TRANSACTION_FAILED,
  CONSECUTIVE_PAYMENT_VERIFICATION_REQUEST_GAP,
} from "../../config/constants";
import { makeStyles } from "@material-ui/styles";
import { ShoppingCart } from "@material-ui/icons";
import Router from "next/router";
import { refreshUserProfile } from "../../redux/actions";
import fetch from "isomorphic-unfetch";

const useStyles = makeStyles((theme) => ({
  header: {},
  divider: {
    margin: theme.spacing(2, 0),
  },
  paymentHeader: {
    marginBotton: theme.spacing(1),
  },
  progressBar: {
    margin: theme.spacing(2, 0),
  },
  checkoutIcon: {
    display: "flex",
    alignItems: "center",
    marginRight: theme.spacing(1),
  },
  error: {
    color: "red",
  },
  paymentTemplate: {
    margin: "0.8em 0em",
  },
}));

const PaymentDialog = (props) => {
  const { onClose, open, course, auth } = props;
  const { paymentMethod } = props.siteInfo;
  const [paymentTracker, setPaymentTracker] = useState("");
  const [purchaseId, setPurchaseId] = useState("");
  const [error, setError] = useState("");
  const classes = useStyles();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    initiatePayment();
  }, [props.open]);

  const initiatePayment = async () => {
    if (props.open) {
      setLoading(true);

      try {
        const initiatePaymentResponse = await makePaymentRequest(course.id);
        switch (initiatePaymentResponse.status) {
          case TRANSACTION_SUCCESS:
            courseBought();
            break;
          case TRANSACTION_FAILED:
            setError(initiatePaymentResponse.error);
            break;
          case TRANSACTION_INITIATED:
            setPaymentTracker(initiatePaymentResponse.paymentTracker);
            setPurchaseId(initiatePaymentResponse.purchaseId);
            break;
          default:
          // do nothing
        }
      } catch (err) {
        setError(err.message);
      }

      setLoading(false);
    } else {
      resetState();
    }
  };

  const makePaymentRequest = async (courseId) => {
    const formData = new window.FormData();
    formData.append("courseid", courseId);

    const res = await fetch(`${BACKEND}/payment/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: formData,
    });

    if (res.status === 401) {
      Router.push("/login");
      return;
    }

    return res.json();
  };

  const courseBought = () => {
    props.dispatch(refreshUserProfile());
    onClose();
  };

  const resetState = () => {
    setPaymentTracker("");
    setError("");
    setLoading(false);
  };

  const paymentSuccess = async () => {
    let paymentIsVerifiedOnServer = false;

    setLoading(true);
    for (let i = 0; i < 10; i++) {
      paymentIsVerifiedOnServer = await verifyPaymentOnServer();
      if (paymentIsVerifiedOnServer) {
        break;
      }
      await new Promise((resolve) =>
        setTimeout(resolve, CONSECUTIVE_PAYMENT_VERIFICATION_REQUEST_GAP)
      );
    }
    setLoading(false);

    if (paymentIsVerifiedOnServer) {
      courseBought();
    } else {
      setError(PAYMENT_VERIFICATION_FAILED);
    }
  };

  const verifyPaymentOnServer = async () => {
    const formData = new window.FormData();
    formData.append("purchaseid", purchaseId);

    let res = await fetch(`${BACKEND}/payment/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${auth.token}`,
      },
      body: formData,
    });

    if (res.status === 401) {
      Router.push("/login");
      return;
    }
    res = await res.json();

    if (res.status && res.status === TRANSACTION_SUCCESS) {
      return true;
    } else {
      return false;
    }
  };

  const paymentError = (error) => setError(error.message);

  return (
    <Dialog onClose={onClose} open={open} maxWidth="sm" fullWidth={true}>
      <DialogTitle>
        <Grid container direction="row" className={classes.header}>
          <Grid item className={classes.checkoutIcon}>
            <ShoppingCart />
          </Grid>
          <Grid item>{CHECKOUT_DIALOG_TITLE}</Grid>
        </Grid>
      </DialogTitle>
      <DialogContent>
        <Grid container direction="row" alignItems="center">
          <Grid item xs>
            <Typography variant="h4">{course.title}</Typography>
          </Grid>
          <Grid item>
            <Typography variant="subtitle1">
              {props.siteInfo.currencyUnit}
              {course.cost}
            </Typography>
          </Grid>
        </Grid>
        <Divider variant="middle" className={classes.divider} />

        {loading && (
          <Grid container justify="center" className={classes.paymentTemplate}>
            <Grid item>
              <CircularProgress color="secondary" />
            </Grid>
          </Grid>
        )}

        {!loading && (
          <>
            {error && (
              <Grid
                container
                alignItems="center"
                className={classes.paymentTemplate}
                direction="column"
              >
                <Grid item>
                  <Typography variant="subtitle1" className={classes.error}>
                    {error}
                  </Typography>
                </Grid>
                {error === PAYMENT_VERIFICATION_FAILED && (
                  <Grid item>
                    <Button onClick={paymentSuccess} color="primary">
                      {CAPTION_TRY_AGAIN}
                    </Button>
                  </Grid>
                )}
              </Grid>
            )}
            {!error && (
              <>
                {paymentTracker && (
                  <>
                    {/* <Typography variant="h6">
                      {PAYMENTS_SHIPPING_ADDRESS_SECTION_HEADER}
                    </Typography>
                    <TextField
                      required
                      variant="outlined"
                      label="Name"
                      fullWidth
                      margin="normal"
                      name="name"
                      value={shippingAddress.name}
                      onChange={onShippingDetailsChanged}
                      autoComplete="name"
                    />
                    <TextField
                      required
                      variant="outlined"
                      label="Address Line 1"
                      fullWidth
                      margin="normal"
                      name="addressLineOne"
                      value={shippingAddress.addressLineOne}
                      onChange={onShippingDetailsChanged}
                      autoComplete="shipping street-address"
                    />
                    <Grid container direction="row" spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          variant="outlined"
                          label="City"
                          fullWidth
                          margin="normal"
                          name="city"
                          value={shippingAddress.city}
                          onChange={onShippingDetailsChanged}
                          autoComplete="shipping locality"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          variant="outlined"
                          label="State"
                          fullWidth
                          margin="normal"
                          name="state"
                          value={shippingAddress.state}
                          onChange={onShippingDetailsChanged}
                          autoComplete="shipping region"
                        />
                      </Grid>
                    </Grid>

                    <Grid container direction="row" spacing={1}>
                      <Grid item xs={6}>
                        <TextField
                          variant="outlined"
                          label="Postal Code"
                          fullWidth
                          margin="normal"
                          name="postalCode"
                          value={shippingAddress.postalCode}
                          onChange={onShippingDetailsChanged}
                          autoComplete="shipping postal-code"
                        />
                      </Grid>
                      <Grid item xs={6}>
                        <TextField
                          variant="outlined"
                          label="Country"
                          fullWidth
                          margin="normal"
                          name="country"
                          value={shippingAddress.country}
                          onChange={onShippingDetailsChanged}
                          autoComplete="shipping country"
                        />
                      </Grid>
                    </Grid> */}

                    <Typography variant="h6" className={classes.paymentHeader}>
                      {PAYMENT_MODAL_PAYMENT_DETAILS_HEADER}
                    </Typography>
                    {paymentMethod === PAYMENT_METHOD_STRIPE && (
                      <Stripe
                        sessionId={paymentTracker}
                        onSuccess={paymentSuccess}
                        onError={paymentError}
                      />
                    )}
                    {paymentMethod === PAYMENT_METHOD_PAYTM && <></>}
                    {paymentMethod === PAYMENT_METHOD_PAYPAL && <></>}
                  </>
                )}
              </>
            )}
          </>
        )}
        {/*
        {paymentPhase === INITIATION_PHASE &&
          <>
            {error &&
              <Grid
                container
                justify='center'
                className={classes.paymentTemplate}>
                <Grid item>
                  <Typography variant='subtitle1'>
                    {error}
                  </Typography>
                </Grid>
              </Grid>
            }
            {(!error && paymentTracker) &&
              <>
                {paymentMethod === PAYMENT_METHOD_STRIPE &&
                  <Stripe
                    clientSecret={paymentTracker}
                    onSuccess={paymentSuccess}
                    onError={paymentError} />}
                {paymentMethod === PAYMENT_METHOD_PAYTM && <></>}
                {paymentMethod === PAYMENT_METHOD_PAYPAL && <></>}
              </>
            }
            {(!error && !paymentTracker) &&
              <Grid
                container
                justify='center'
                className={classes.paymentTemplate}>
                <Grid item>
                  <CircularProgress color='secondary' />
                </Grid>
              </Grid>
            }
          </>
        }

        {paymentPhase === VERIFICATION_PHASE &&
          <>
            <Grid
                container
                justify='center'
                className={classes.paymentTemplate}>
                {error &&
                  <>
                    <Grid item>
                      <CircularProgress color='secondary' />
                    </Grid>
                    <Grid item>
                      <Typography variant='subtitle1'>
                        {PAYMENT_VERIFICATION_UNDERWAY}
                      </Typography>
                    </Grid>
                  </>
                }
                {!error &&
                  <Grid item>
                    <Typography variant='subtitle1'>
                      {error}
                    </Typography>
                  </Grid>
                }
            </Grid>
          </>
        } */}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} color="secondary">
          {CAPTION_CLOSE}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

PaymentDialog.propTypes = {
  course: publicCourse.isRequired,
  siteInfo: siteInfoProps.isRequired,
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  siteInfo: state.siteinfo,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(PaymentDialog);
