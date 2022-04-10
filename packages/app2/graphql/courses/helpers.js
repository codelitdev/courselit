const { getPaymentMethod } = require("../../payments/index");
const strings = require("../../config/strings");
const mediaLogic = require("../media/logic");

const validatePaymentMethod = async (domain) => {
  try {
    await getPaymentMethod(domain);
  } catch (err) {
    if (err.message === strings.responses.update_payment_method) {
      throw err;
    } else {
      throw new Error(strings.responses.internal_error);
    }
  }
};

exports.validateBlogPosts = async (courseData, ctx) => {
  if (courseData.isBlog) {
    if (!courseData.description) {
      throw new Error(strings.responses.blog_description_empty);
    }

    if (courseData.lessons && courseData.lessons.length) {
      throw new Error(strings.responses.cannot_convert_to_blog);
    }

    courseData.cost = 0;
  }

  if (courseData.featuredImage) {
    const featuredImageHasPublicAccess = await mediaLogic.checkMediaForPublicAccess(
      courseData.featuredImage,
      ctx
    );
    if (!featuredImageHasPublicAccess) {
      throw new Error(strings.responses.publicly_inaccessible);
    }
  }

  if (courseData.cost < 0) {
    throw new Error(strings.responses.invalid_cost);
  }

  if (courseData.cost > 0) {
    await validatePaymentMethod(ctx.subdomain._id);
  }

  return courseData;
};

// exports.validateCost = async (courseData, domain) => {
//   if (courseData.cost < 0) {
//     throw new Error(strings.responses.invalid_cost);
//   }

//   if (courseData.cost > 0) {
//     await validatePaymentMethod(domain);
//   }

//   return courseData;
// };
