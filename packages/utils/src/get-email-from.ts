export const getEmailFrom = ({
    name,
    email,
}: {
    name: string;
    email: string;
}) => {
    return `${name} <${email}>`;
};
