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
            .courselit-branding {
                width: 155px;
                height: 9px;
                padding: 2px;
                border: 1px solid;
                border-radius: 5px;
                background-color: #FFFFFF;
                color: #000000;
                font-size: small;
                display: flex;
                align-items: center;
                gap: 1px;
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
        div(class="courselit-branding")
            | Powered by <span style="font-weight: bold;">CourseLit</span>    
`;

export default loginEmail;
