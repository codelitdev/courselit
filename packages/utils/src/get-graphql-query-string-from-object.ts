// Regex copied from: https://stackoverflow.com/a/48675160/942589
export default function getGraphQLQueryStringFromObject(
    obj: Record<string, unknown> | string[],
) {
    return JSON.stringify(obj).replace(/"([^(")"]+)":/g, "$1:");
}
