import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { Grid, TextField, Button, Typography } from "@material-ui/core";
import { Section } from "@courselit/components-library";

const Widget = (props) => {
    const { fetchBuilder, name } = props;
    const [settings, setSettings] = useState({});

    useEffect(() => {
        getSettings();
    }, [name]);

    const getSettings = async () => {
        const query = `
    query {
        settings: getWidgetSettings(name: "${name}") {
            settings
        }
    }
    `;

        const fetch = fetchBuilder.setPayload(query).build();
        try {
            const response = await fetch.exec();
            setSettings(JSON.parse(response.settings.settings));
        } catch (err) {}
    };

    const onSubmit = () => {
        window.open(
            `https://buttondown.email/${settings.username}`,
            "popupwindow"
        );
    };

    return (
        <div>
            {settings.username && (
                <Section>
                    <Grid container direction="column" spacing={2}>
                        <Grid item>
                            <Typography variant="h5">
                                {settings.title}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <Typography
                                variant="subtitle1"
                                color="textSecondary"
                            >
                                {settings.subtitle}
                            </Typography>
                        </Grid>
                        <Grid item>
                            <form
                                action={`https://buttondown.email/api/emails/embed-subscribe/${settings.username}`}
                                method="post"
                                target="popupwindow"
                                onSubmit={onSubmit}
                                className="embeddable-buttondown-form"
                            >
                                <Grid
                                    container
                                    spacing={2}
                                    direction="column"
                                    justify="space-between"
                                >
                                    <Grid item xs={12}>
                                        <TextField
                                            variant="outlined"
                                            name="email"
                                            id="bd-email"
                                            type="email"
                                            placeholder="name@email.com"
                                            required
                                            fullWidth
                                        />
                                    </Grid>
                                    <Grid item xs={12}>
                                        <input
                                            type="hidden"
                                            value="1"
                                            name="embed"
                                        />
                                        <Button type="submit">
                                            {settings.buttonLabel || "Sign up"}
                                        </Button>
                                    </Grid>
                                </Grid>
                            </form>
                        </Grid>
                        <Grid item>
                            <Typography variant="caption" color="textSecondary">
                                Powered by{" "}
                                <a
                                    href="https://buttondown.email"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: "inherit" }}
                                >
                                    Buttondown
                                </a>
                            </Typography>
                        </Grid>
                    </Grid>
                </Section>
            )}
        </div>
    );
};

Widget.propTypes = {
    name: PropTypes.string.isRequired,
    fetchBuilder: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
    auth: state.auth,
});

export default connect(mapStateToProps)(Widget);
