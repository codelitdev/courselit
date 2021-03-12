import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@material-ui/core";
import { addressProps, authProps, publicCourse } from "../../types";
import { ENROLL_BUTTON_TEXT } from "../../config/strings";
import { connect } from "react-redux";
import fetch from "isomorphic-unfetch";
import { useRouter } from "next/router";
import { networkAction, setAppMessage } from "../../redux/actions";
import AppMessage from "../../models/app-message";

const Free = ({ course, auth, dispatch, address }) => {
  const router = useRouter();
  const [disabled, setDisabled] = useState(false);

  const handleClick = async () => {
    try {
      setDisabled(true);
      dispatch(networkAction(true));

      let initiatePaymentResponse = await makePaymentRequest({
        courseId: course.id,
        backend: address.backend,
        token: auth.token,
        dispatch,
      });

      if (initiatePaymentResponse.status === 401) {
        router.push(`/login?redirect=${router.asPath}`);
        return;
      }

      initiatePaymentResponse = await initiatePaymentResponse.json();
      if (initiatePaymentResponse.status === "success") {
        router.reload();
      } else if (initiatePaymentResponse.status === "failed") {
        dispatch(setAppMessage(new AppMessage(initiatePaymentResponse.error)));
      }
    } catch (err) {
      dispatch(setAppMessage(new AppMessage(err.message)));
    } finally {
      dispatch(networkAction(false));
      setDisabled(false);
    }
  };

  const makePaymentRequest = async ({ courseId, backend, token, dispatch }) => {
    const formData = new window.FormData();
    formData.append("courseid", courseId);

    const res = await fetch(`${backend}/payment/initiate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    return res;
  };

  return (
    <Button
      onClick={handleClick}
      variant="contained"
      color="primary"
      disabled={disabled}
    >
      {ENROLL_BUTTON_TEXT}
    </Button>
  );
};

Free.propTypes = {
  course: publicCourse.isRequired,
  auth: authProps,
  dispatch: PropTypes.func.isRequired,
  address: addressProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
  address: state.address,
});

const mapDispatchToProps = (dispatch) => ({
  dispatch: dispatch,
});

export default connect(mapStateToProps, mapDispatchToProps)(Free);
