import React from "react";
import { Button } from "@material-ui/core";
import { authProps, publicCourse } from "../../types";
import { ENROLL_BUTTON_TEXT } from "../../config/strings";
import { connect } from "react-redux";
import fetch from "isomorphic-unfetch";
import { BACKEND } from "../../config/constants";
import { useRouter } from "next/router";

const Free = ({ course, auth }) => {
  const router = useRouter();

  const handleClick = async () => {
    let initiatePaymentResponse = await makePaymentRequest({
      courseId: course.id,
      backend: BACKEND,
      token: auth.token,
    });

    if (initiatePaymentResponse.status === 401) {
      router.push(`/login?redirect=${router.asPath}`);
      return;
    }

    try {
      initiatePaymentResponse = await initiatePaymentResponse.json();
      // console.log(initiatePaymentResponse);
    } catch (err) {}
  };

  const makePaymentRequest = async ({ courseId, backend, token }) => {
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
    <Button onClick={handleClick} variant="contained" color="primary">
      {ENROLL_BUTTON_TEXT}
    </Button>
  );
};

Free.propTypes = {
  course: publicCourse.isRequired,
  auth: authProps,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps)(Free);
