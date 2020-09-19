import React from 'react';
import PropTypes from 'prop-types';

const Buttondown = (props) => {
    return (
        <div>
            <form
                action="https://buttondown.email/api/emails/embed-subscribe/rajats"
                method="post"
                target="popupwindow"
                onsubmit="window.open('https://buttondown.email/rajats', 'popupwindow')"
                class="embeddable-buttondown-form"
                >
                <label for="bd-email">Enter your email</label>
                <input type="email" name="email" id="bd-email"></input>
                <input type="hidden" value="1" name="embed"></input>
                <input type="submit" value="Subscribe"></input>
                <p>
                    <a href="https://buttondown.email" target="_blank">Powered by Buttondown.</a>
                </p>
            </form>
        </div>
    )
}

Buttondown.propTypes = {
    fetch: PropTypes.func.isRequired
}

export default Buttondown;
