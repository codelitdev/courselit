import { Widget } from "@courselit/common-models";
import {
    Banner,
    Featured,
    Footer,
    Header,
    RichText,
    EmailForm,
    Hero,
    Grid,
    Content,
} from "@courselit/common-widgets";

function loadWidgets(): Record<string, any> {
    const widgets: Record<string, Widget> = {};

    // Add common widgets to CourseLit
    widgets[RichText.metadata.name] = RichText;
    widgets[Featured.metadata.name] = Featured;
    widgets[Banner.metadata.name] = Banner;
    widgets[Hero.metadata.name] = Hero;
    widgets[Grid.metadata.name] = Grid;
    widgets[Content.metadata.name] = Content;
    widgets[Footer.metadata.name] = Object.assign({}, Footer, { shared: true });
    widgets[Header.metadata.name] = Object.assign({}, Header, { shared: true });
    widgets[EmailForm.metadata.name] = Object.assign({}, EmailForm, {
        shared: true,
    });

    return widgets;
}

const widgets = loadWidgets();
export default widgets;
