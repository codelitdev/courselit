/**
 * A model for the front-end layout.
 */
import { Layout } from "@courselit/common-models";
import mongoose from "mongoose";

const LayoutSchema = new mongoose.Schema<Layout>({
    top: [{ type: String }],
    bottom: [{ type: String }],
    aside: [{ type: String }],
    footerLeft: [{ type: String }],
    footerRight: [{ type: String }],
});

export default LayoutSchema;
