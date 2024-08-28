const loginEmail = `
doctype html
html
    head
        style(type='text/css').
            .cta-container {
                margin: 32px 0px;
                text-align: center;
            }
            .cta {
                border: 1px solid #07077b;
                border-radius: 4px;
                padding: 4px 8px;
                text-decoration: none;
                color: white;
                background-color: #07077b;
                font-weight: bold;
            }
            .cta:hover {
                background-color: #060665;
            }
             .courselit-branding-container {
                margin: 40px 0px;
            }
            .courselit-branding-cta {
                text-decoration: none;
                color: #000000;
                padding: 10px;
                background-color: #FFFFFF;
                border: 1px solid;
                border-radius: 4px;
                text-align: center;
            }
    body
        p   To sign in to your school, click the following link.
        div(class="cta-container") 
            a(
                href=\`\${magiclink}\`
                class="cta"
            ) Sign in
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

export default loginEmail;
