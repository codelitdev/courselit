export const getBackendAddress = (
    headers: Headers,
): `${string}://${string}` => {
    return `${headers.get("x-forwarded-proto")}://${headers.get("host")}`;
};
