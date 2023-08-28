export default function checkPermission(
    actualPermissions: string[],
    desiredPermissions: string[],
) {
    return actualPermissions.some((permission) =>
        desiredPermissions.includes(permission),
    );
}
