const { getPaymentMethod } = require("../../payments/index.js");
const strings = require("../../config/strings.js");
const Logger = require("../../lib/logger.js");

const validatePaymentMethod = async (domain) => {
  try {
    await getPaymentMethod(domain);
  } catch (err) {
    if (err.message === strings.responses.update_payment_method) {
      throw err;
    } else {
      Logger.error(err.message, err);
      throw new Error(strings.responses.internal_error);
    }
  }
};

exports.validateBlogPosts = (courseData) => {
  if (courseData.isBlog) {
    if (!courseData.description) {
      throw new Error(strings.responses.blog_description_empty);
    }

    if (courseData.lessons && courseData.lessons.length) {
      throw new Error(strings.responses.cannot_convert_to_blog);
    }

    courseData.cost = 0;
  }

  return courseData;
};

exports.validateCost = async (courseData, domain) => {
  if (courseData.cost < 0) {
    throw new Error(strings.responses.invalid_cost);
  }

  if (courseData.cost > 0) {
    await validatePaymentMethod(domain);
  }

  return courseData;
};
