const magicCodeEmail = `
doctype html
html
    body
        p   Your verification code is: #{code}
        p
            strong IMPORTANT:
            |   Do not share this email with anyone as anyone can log in to your
            |   account using the link in this email.
`;

export default magicCodeEmail;
