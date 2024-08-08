const magicCodeEmail = `
doctype html
html
    head
        style(type='text/css').
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
            | Powered by <span style="font-weight: bold;">CourseLit</span>    
`;

export default magicCodeEmail;
