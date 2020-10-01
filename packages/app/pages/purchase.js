import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { connect } from "react-redux";
import { BACKEND } from "../config/constants.js";
import BaseLayout from "../components/Public/BaseLayout";
import fetch from "isomorphic-unfetch";

const Payment = (props) => {
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (props.auth && props.auth.token) {
      getPaymentStatus();
    }
  });

  const getPaymentStatus = async () => {
    let paymentStatus = await makePaymentStatusRequest({
      purchaseId: router.query.id,
      backend: BACKEND,
      token: props.auth.token,
    });

    if (paymentStatus.status === 401) {
      router.push("/login");
      return;
    }

    try {
      paymentStatus = await paymentStatus.json();
      setStatus(paymentStatus.status);
    } catch (err) {}
  };

  const makePaymentStatusRequest = async ({ purchaseId, backend, token }) => {
    setLoading(true);

    const formData = new window.FormData();
    formData.append("purchaseid", purchaseId);

    const res = await fetch(`${backend}/payment/verify`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });

    setLoading(false);

    return res;
  };

  return (
    <BaseLayout title="Payment confirmation">
      <div>Payment status: {loading ? "loading..." : status}</div>
    </BaseLayout>
  );
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps)(Payment);
