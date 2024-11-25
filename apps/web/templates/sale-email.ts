const saleEmailTemplate = `
doctype html
html
    head
        style(type='text/css').
            .email-container {
                max-width: 960px;
            }
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
                padding: 6px 10px;
                background-color: #FFFFFF;
                border: 1px solid;
                border-radius: 6px;
                text-align: center;
            }
            .sale-notification-heading {
                padding-bottom: 5px;
            }
            .sale-details {
                padding-bottom: 10px;
            }
            .course-name-and-price {
                display: flex;
                justify-content: space-between;
                align-items: center;
                font-weight: bold;
                padding-bottom: 20px;
            }
    body
        div(class="email-container")
        div(class="sale-notification-heading")
            p Yay! You have made a sale!
        div(class="sale-details")    
            p <strong>Order</strong>: #{order}
            p <strong>Date</strong>: #{date}
            p <strong>Email</strong>: #{email}
        div(class="course-name-and-price")
            span #{courseName}
            span #{coursePrice}
        p(class="signature") 
                | Best,
        p #[a(href="https://x.com/courselit") @CourseLit]
        if !hideCourseLitBranding
            div(class="courselit-branding-container")
                a(
                    href="https://courselit.app"
                    target="_blank"
                    class="courselit-branding-cta"
                ) Powered by <strong>CourseLit</strong>
`;

export default saleEmailTemplate;
