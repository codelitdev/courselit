const magicCodeEmail = `
doctype html
html
    head
        style(type='text/css').     
            .courselit-branding-container {
                margin: 40px 0px;
            }
            .courselit-branding-cta {
                text-decoration: none;
                color: #000000;
                padding: 6px 10px;
                background-color: #FFFFFF;
                border: 1px solid;
                border-radius: 6px;
                text-align: center;
            }
    body
        p   Your verification code is: #{code}
        p
            strong IMPORTANT:
            |   Do not share this email with anyone as anyone can log in to your
            |   account using the link in this email.
        if !hideCourseLitBranding
            div(class="courselit-branding-container")
                a(
                    href="https://courselit.app"
                    target="_blank"
                    class="courselit-branding-cta"
                ) Powered by <strong> CourseLit </strong>
`;

export default magicCodeEmail;
