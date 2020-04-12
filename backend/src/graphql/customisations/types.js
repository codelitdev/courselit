const graphql = require('graphql');

// const themeType = new graphql.GraphQLObjectType({
//     name: 'Theme',
//     fields: {
//         primaryColor: { type: graphql.GraphQLString },
//         secondaryColor: { type: graphql.GraphQLString }
//     }
// })

// const codeInjectionType = new graphql.GraphQLObjectType({
//     name: 'CodeInjection',
//     fields: {
//         head: { type: graphql.GraphQLString }
//     }
// })

const customisationType = new graphql.GraphQLObjectType({
    name: 'Customisation',
    fields: {
        themePrimaryColor: { type: graphql.GraphQLString },
        themeSecondaryColor: { type: graphql.GraphQLString },
        codeInjectionHead: { type: graphql.GraphQLString }
    }
})

const customisationInputType = new graphql.GraphQLInputObjectType({
    name: 'CustomisationInput',
    fields: {
        themePrimaryColor: { type: graphql.GraphQLString },
        themeSecondaryColor: { type: graphql.GraphQLString },
        codeInjectionHead: { type: graphql.GraphQLString }
    }
})

module.exports = {
    customisationType,
    customisationInputType
}