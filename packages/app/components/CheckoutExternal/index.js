import React from "react";
import { connect } from "react-redux";
import {
  PAYMENT_METHOD_PAYPAL,
  PAYMENT_METHOD_PAYTM,
  PAYMENT_METHOD_STRIPE,
} from "../../config/constants";
import { publicCourse, siteInfoProps } from "../../types";
import Stripe from "./Stripe.js";
import Free from "./Free.js";

const CheckoutExternal = (props) => {
  const { course } = props;
  const { paymentMethod } = props.siteInfo;

  return (
    <>
      {course.cost === 0 && <Free course={course} />}
      {course.cost !== 0 && (
        <>
          {paymentMethod === PAYMENT_METHOD_STRIPE && (
            <Stripe course={course} />
          )}
          {paymentMethod === PAYMENT_METHOD_PAYTM && <></>}
          {paymentMethod === PAYMENT_METHOD_PAYPAL && <></>}
        </>
      )}
    </>
  );
};

CheckoutExternal.propTypes = {
  course: publicCourse.isRequired,
  siteInfo: siteInfoProps.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  siteInfo: state.siteinfo,
});

export default connect(mapStateToProps)(CheckoutExternal);
