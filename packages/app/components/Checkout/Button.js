import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@material-ui/core";
import { connect } from "react-redux";
import { publicCourse, authProps, profileProps } from "../../types";
import PaymentDialog from "./PaymentDialog.js";
import Router from "next/router";
import { ENROLL_BUTTON_TEXT } from "../../config/strings";

const CheckoutButton = (props) => {
  const [dialogOpened, setDialogOpened] = useState(false);
  const { course, auth } = props;

  const buyCourse = () => {
    if (auth.guest) {
      Router.push("/login");
    } else {
      setDialogOpened(true);
    }
  };

  const cancelPayment = () => setDialogOpened(false);

  return (
    <>
      <Button onClick={buyCourse} variant="contained" color="secondary">
        {ENROLL_BUTTON_TEXT}
      </Button>
      <PaymentDialog
        course={course}
        open={dialogOpened}
        onClose={cancelPayment}
      />
    </>
  );
};

CheckoutButton.propTypes = {
  course: publicCourse.isRequired,
  onTransactionSuccess: PropTypes.func.isRequired,
  onTransactionFailure: PropTypes.func.isRequired,
  auth: authProps,
  profile: profileProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  profile: state.profile,
});

export default connect(mapStateToProps)(CheckoutButton);
