exports.validateBlogPosts = (courseData) => {
    if (courseData.isBlog) {
      if (!courseData.description) {
        throw new Error(strings.responses.blog_description_empty);
      }
  
      courseData.cost = 0;
    }
  
    return courseData;
  };
  
exports.validateCost = async (courseData) => {
    if (courseData.cost < 0) {
      throw new Error(strings.responses.invalid_cost);
    }
  
    if (courseData.cost > 0) {
      await validatePaymentMethod();
    }
  
    return courseData;
  };
  
exports.validatePaymentMethod = async () => {
    const siteinfo = (await SiteInfo.find())[0];
    await getPaymentMethod(siteinfo && siteinfo.paymentMethod);
  };