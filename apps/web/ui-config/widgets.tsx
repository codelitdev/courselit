// import buttondown from "@courselit/widget-buttondown";
import { Widget } from "@courselit/common-models";
import {
    RichText,
    TaggedContent,
    Footer,
    Header,
    Featured,
    Banner,
} from "@courselit/common-widgets";

function loadWidgets(): Record<string, any> {
    const widgets: Record<string, Widget> = {};

    // Add common widgets to CourseLit
    widgets[RichText.metadata.name] = RichText;
    // widgets[TaggedContent.metadata.name] = TaggedContent;
    widgets[Footer.metadata.name] = Footer;
    widgets[Header.metadata.name] = Header;
    widgets[Featured.metadata.name] = Featured;
    widgets[Banner.metadata.name] = Banner;

    // Additional widgets are added here
    // widgets[buttondown.metadata.name] = buttondown;

    return widgets;
}

const widgets = loadWidgets();
export default widgets;
