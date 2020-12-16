/**
 * Default CSS Styles.
 */

export default {
  controls: {
    container: {
      display: "flex",
      flexDirection: "column",
      border: "1px solid #eee",
    },
    editor: {
      maxHeight: "50vh",
      overflowX: "none",
      overflowY: "scroll",
      padding: 10,
    },
    toolbar: {
      padding: 10,
      background: "#f7f7f7",
      display: "flex",
      flexDirection: "row",
      alignItems: "center",
      flexWrap: "wrap",
    },
    toolbarInput: {
      background: "rgb(179 188 255)",
      padding: 10,
    },
    toolbarButton: {
      border: "none",
      background: "transparent",
      padding: "10 4",
      fontWeight: "bold",
      fontSize: 16,
      cursor: "pointer",
    },
  },
  media: {
    container: {
      display: "flex",
      justifyContent: "center",
    },
    img: {
      maxWidth: "100%",
    },
  },
  code: {
    background: "rgb(45, 45, 45)",
    color: "#e2e7ff",
    padding: 10,
    borderRadius: 2,
    marginBottom: 16,
    fontSize: "1.2em",
    overflowWrap: "anywhere",
  },
  blockquote: {
    fontStyle: "italic",
    fontFamily: "serif",
    marginTop: 10,
    marginBottom: 10,
    borderLeft: "5px solid rgb(179 188 255)",
    paddingLeft: 10,
    fontSize: "1.6em",
    color: "rgb(58 58 58)",
  },
  text: {
    marginBottom: "2rem",
  },
};
