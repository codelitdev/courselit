const graphql = require("graphql");
const types = require("./types.js");
const logic = require("./logic.js");

module.exports = {
  updateCustomisations: {
    type: types.customisationType,
    args: {
      customisationsData: {
        type: new graphql.GraphQLNonNull(types.customisationInputType)
      }
    },
    resolve: async (root, { customisationsData }, context) =>
      logic.updateCustomisations(customisationsData, context)
  }
};
