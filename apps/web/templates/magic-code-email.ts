const magicCodeEmail = `
doctype html
html
    head
        style(type='text/css').
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
        p   Your verification code is: #{code}
        p
            strong IMPORTANT:
            |   Do not share this email with anyone as anyone can log in to your
            |   account using the link in this email.
        div(class="courselit-branding")
            a(
                href="https://courselit.app"
                target="_blank"
                class="cta"
            ) Powered by 
        span(style="font-weight: bold") CourseLit
`;

export default magicCodeEmail;
