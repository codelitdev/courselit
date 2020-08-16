import React from "react";
import PropTypes from "prop-types";
import { connect } from "react-redux";

class CodeInjector extends React.Component {
  componentDidMount() {
    const targetTagsForInjection = ["head"];
    for (const target of targetTagsForInjection) {
      this.injectCodeIn(target);
    }
  }

  injectCodeIn(targetHTMLTag) {
    const tempContainer = document.createElement("div");
    tempContainer.innerHTML = this.props.codeForHead;
    const children = tempContainer.children;
    for (let i = 0; i < children.length; i++) {
      let elem = children[i];
      if (elem.nodeName === "SCRIPT") {
        const script = document.createElement("script");
        script.innerHTML = elem.innerHTML;
        this.copyAttributes(elem, script);
        elem = script;
      }
      document[targetHTMLTag].appendChild(elem);
    }
  }

  copyAttributes(source, target) {
    let attr;
    const attributes = Array.prototype.slice.call(source.attributes);
    while ((attr = attributes.pop())) {
      target.setAttribute(attr.nodeName, attr.nodeValue);
    }
  }

  render() {
    return <></>;
  }
}

CodeInjector.propTypes = {
  codeForHead: PropTypes.string,
};

const mapStateToProps = (state) => ({
  codeForHead: state.siteinfo.codeInjectionHead,
});

export default connect(mapStateToProps)(CodeInjector);
