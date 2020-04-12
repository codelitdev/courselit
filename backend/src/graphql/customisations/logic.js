const {
    checkIfAuthenticated
} = require("../../lib/graphql.js");
const { responses } = require("../../config/strings.js");
const Customisations = require('../../models/Customisation.js');

// TODO: write tests
exports.getCustomisations = async () => {
    const customisations = await Customisations.find()
    return customisations[0]
}

// TODO: write tests
exports.updateCustomisations = async (customisationsData, ctx) => {
    checkIfAuthenticated(ctx)
    if (!ctx.user.isAdmin) {
        throw new Error(responses.is_not_admin);
    }

    let customisations = await Customisations.find()
    customisations = customisations[0];

    // create a new entry if not existing
    let shouldCreate = false;
    if (customisations === undefined) {
        shouldCreate = true;
        customisations = {};
    }

    for (const key of Object.keys(customisationsData)) {
        customisations[key] = customisationsData[key];
    }

    if (shouldCreate) {
        customisations = await Customisations.create(customisations)
    } else {
        customisations = await customisations.save()
    }

    return customisations
}