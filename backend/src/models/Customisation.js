const mongoose = require('mongoose');

const CustomisationSchema = new mongoose.Schema({
    themePrimaryColor: { type: String },
    themeSecondaryColor: { type: String },
    codeInjectionHead: { type: String }
})

module.exports = mongoose.model('Customisation', CustomisationSchema)