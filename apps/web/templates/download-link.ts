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
`;

export default digitalDownloadTemplate;
