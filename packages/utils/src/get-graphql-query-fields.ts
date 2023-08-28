export default function getGraphQLQueryFields(
    jsObj: any,
    fieldsNotPutBetweenQuotes: string[] = [],
) {
    let queryString = "{";
    for (const i of Object.keys(jsObj)) {
        if (jsObj[i] !== undefined) {
            queryString += fieldsNotPutBetweenQuotes.includes(i)
                ? `${i}: ${jsObj[i]},`
                : `${i}: "${jsObj[i]}",`;
        }
    }
    queryString += "}";

    return queryString;
}
