import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";
import { makeStyles } from "@material-ui/styles";

const useStyles = makeStyles((theme) => ({
  container: {
    padding: theme.spacing(2),
    paddingTop: theme.spacing(4),
  },
  iframe: {
    width: "100%",
    height: 220,
    border: "1px #ccc solid",
  },
}));

const Widget = (props) => {
  const { fetchBuilder, name } = props;
  const [settings, setSettings] = useState({});
  const classes = useStyles();

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

  return (
    <div className={classes.container}>
      {settings.url && (
        <>
          <iframe
            scrolling="no"
            className={classes.iframe}
            src={`${settings.url}?as_embed=true`}
          ></iframe>
          <br />
          <br />
        </>
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
