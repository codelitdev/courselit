/**
 * A model for the front-end layout.
 */
import { Layout } from "@courselit/common-models";
import mongoose from "mongoose";
import WidgetSchema from "./Widget";

const LayoutSchema = new mongoose.Schema<Layout>({
    top: [WidgetSchema],
    bottom: [WidgetSchema],
    aside: [WidgetSchema],
    footerLeft: [WidgetSchema],
    footerRight: [WidgetSchema],
});

export default LayoutSchema;
