import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { TextField, Typography, Grid, Button } from "@material-ui/core";
import { Section } from "@courselit/components-library";

const AdminWidget = (props) => {
    const { fetchBuilder, name, auth } = props;
    const [settings, setSettings] = useState({});
    const [newSettings, setNewSettings] = useState({});

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
            if (response.settings.settings) {
                onNewSettingsReceived(response.settings.settings);
            }
        } catch (err) {}
    };

    const onNewSettingsReceived = (settings) => {
        const parsedSettings = JSON.parse(settings);
        setSettings(parsedSettings);
        setNewSettings(parsedSettings);
    };

    const onChangeData = (e) => {
        setNewSettings(
            Object.assign({}, newSettings, {
                [e.target.name]: e.target.value,
            })
        );
    };

    const saveWidgetSettings = async (event) => {
        event.preventDefault();

        const mutation = `
    mutation {
      settings: saveWidgetSettings(widgetSettingsData: {
        name: "${name}",
        settings: "${JSON.stringify(newSettings).replace(/"/g, '\\"')}"
      }) {
        settings
      }
    }
    `;

        const fetch = fetchBuilder
            .setPayload(mutation)
            .setAuthToken(auth.token)
            .build();
        try {
            const response = await fetch.exec();
            if (response.settings) {
                onNewSettingsReceived(response.settings.settings);
            }
        } catch (err) {}
    };

    const isDirty = () => {
        return (
            newSettings.title !== settings.title ||
            newSettings.buttonLabel !== settings.buttonLabel ||
            newSettings.username !== settings.username ||
            newSettings.subtitle !== settings.subtitle
        );
    };

    return (
        <Section>
            <Grid container direction="column" spacing={2}>
                <Grid item xs>
                    <Typography variant="h6" color="textSecondary">
                        Settings
                    </Typography>
                </Grid>
                <Grid item>
                    <form onSubmit={saveWidgetSettings}>
                        <TextField
                            variant="outlined"
                            label="Buttondown Username"
                            fullWidth
                            margin="normal"
                            name="username"
                            value={newSettings.username || ""}
                            onChange={onChangeData}
                            required
                        />
                        <TextField
                            variant="outlined"
                            label="Title"
                            fullWidth
                            margin="normal"
                            name="title"
                            value={newSettings.title || ""}
                            onChange={onChangeData}
                        />
                        <TextField
                            variant="outlined"
                            label="Subtitle"
                            fullWidth
                            margin="normal"
                            name="subtitle"
                            value={newSettings.subtitle || ""}
                            onChange={onChangeData}
                        />
                        <TextField
                            variant="outlined"
                            label="Sign up button label"
                            fullWidth
                            margin="normal"
                            name="buttonLabel"
                            value={newSettings.buttonLabel || ""}
                            onChange={onChangeData}
                        />
                        <Button
                            type="submit"
                            value="Save"
                            disabled={!isDirty()}
                        >
                            Save
                        </Button>
                    </form>
                </Grid>
            </Grid>
        </Section>
    );
};

AdminWidget.propTypes = {
    name: PropTypes.string.isRequired,
    fetchBuilder: PropTypes.object.isRequired,
    theme: PropTypes.object.isRequired,
    auth: PropTypes.shape({
        guest: PropTypes.bool,
        token: PropTypes.string,
    }),
};

const mapStateToProps = (state) => ({
    auth: state.auth,
});

export default connect(mapStateToProps)(AdminWidget);
