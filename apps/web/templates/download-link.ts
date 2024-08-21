const digitalDownloadTemplate = `
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
        p   Thank you for signing up for #{courseName}.
        div(class="cta-container") 
            a(
                href=\`\${downloadLink}\`
                class="cta"
            ) Download now
        p   Best,
        p   #{name}
        p 
            |   To access all of your content, 
            |   #[a(href=\`\${loginLink}\`) log in] here.
        div(class="courselit-branding")
            a(
                href="https://courselit.app"
                target="_blank"
                class="cta"
            ) Powered by 
        span(style="font-weight: bold") CourseLit 
`;

export default digitalDownloadTemplate;
