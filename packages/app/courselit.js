import buttondown from "@courselit/widget-buttondown";

export default {
  widgets: {
    [buttondown.metadata.name]: buttondown,
    "Widget 2": {
      metadata: {
        icon: "https://buttondown.email/static/images/icons/icon@72.png",
        name: "widget2",
        displayName: "Widget 2",
        compatibleWith: [],
      },
    },
    "Widget 3": {
      metadata: {
        icon: "https://buttondown.email/static/images/icons/icon@72.png",
        name: "widget3",
        displayName: "Widget 3",
        compatibleWith: [],
      },
    },
    "Widget 4": {
      metadata: {
        icon: "https://buttondown.email/static/images/icons/icon@72.png",
        name: "widget4",
        displayName: "Widget 4",
        compatibleWith: [],
      },
    },
  },
};
