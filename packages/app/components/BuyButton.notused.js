import React, { useState } from "react";
import PropTypes from "prop-types";
import { Button } from "@material-ui/core";
import { connect } from "react-redux";
import PriceTag from "./PriceTag";
import { publicCourse } from "../types";

const BuyButton = props => {
  const [purchased] = useState(false);
  const { course } = props;

  const startCourse = () => {};

  const buyCourse = () => {};

  return purchased ? (
    <Button onClick={startCourse}></Button>
  ) : (
    <Button onClick={buyCourse} variant="contained" color="secondary">
      <PriceTag cost={course.cost} />
    </Button>
  );
};

BuyButton.propTypes = {
  course: publicCourse.isRequired,
  onTransactionSuccess: PropTypes.func.isRequired,
  onTransactionFailure: PropTypes.func.isRequired
};

export default connect()(BuyButton);
