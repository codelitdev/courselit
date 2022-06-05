// import buttondown from "@courselit/widget-buttondown";
import {
    About,
    TaggedContent,
    Branding,
    FooterMenu,
} from "@courselit/common-widgets";

function loadWidgets(): Record<string, any> {
    const widgets: Record<string, any> = {};

    // Add common widgets to CourseLit
    widgets[About.metadata.name] = About;
    widgets[TaggedContent.metadata.name] = TaggedContent;
    widgets[Branding.metadata.name] = Branding;
    widgets[FooterMenu.metadata.name] = FooterMenu;

    // Additional widgets are added here
    // widgets[buttondown.metadata.name] = buttondown;

    return widgets;
}

const widgets = loadWidgets();
export default widgets;
