import React, { useEffect, useState } from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

const Buttondown = (props) => {
  const { fetchBuilder, name, theme } = props;
  const [settings, setSettings] = useState({});
  const styles = {
    container: {
      margin: theme.spacing(2),
    },
    iframe: {
      width: "100%",
      height: 220,
      border: "1px #ccc solid",
    },
  };

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
    <div style={styles.container}>
      {settings.url && (
        <>
          <iframe
            scrolling="no"
            style={styles.iframe}
            src={`${settings.url}?as_embed=true`}
          ></iframe>
          <br />
          <br />
        </>
      )}
    </div>
  );
};

Buttondown.propTypes = {
  name: PropTypes.string.isRequired,
  fetchBuilder: PropTypes.object.isRequired,
  theme: PropTypes.object.isRequired,
};

const mapStateToProps = (state) => ({
  auth: state.auth,
});

export default connect(mapStateToProps)(Buttondown);
