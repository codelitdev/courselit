const magicCodeEmail = `
doctype html
html
    head
        style(type='text/css').     
            .courselit-branding-container {
                width: 155px;
                height: 20px;
                margin-top: 48px;
                padding: 8px 4px;
                background-color: #FFFFFF;
                border: 1px solid;
                border-radius: 4px;
                text-align: center;
            }
            .courselit-branding-cta {
                text-decoration: none;
                color: #000000;
            }
    body
        p   Your verification code is: #{code}
        p
            strong IMPORTANT:
            |   Do not share this email with anyone as anyone can log in to your
            |   account using the link in this email.
        div(class="courselit-branding-container")
            a(
                href="https://courselit.app"
                target="_blank"
                class="courselit-branding-cta"
            ) Powered by <strong> CourseLit </strong>
`;

export default magicCodeEmail;
