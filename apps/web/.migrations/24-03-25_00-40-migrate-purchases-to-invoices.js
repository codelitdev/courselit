import mongoose from "mongoose";
import { nanoid } from "nanoid";

function generateUniqueId() {
    return nanoid();
}

mongoose.connect(process.env.DB_CONNECTION_STRING, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const DomainSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
});

const Domain = mongoose.model("Domain", DomainSchema);

const PaymentPlanSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        planId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        name: { type: String, required: true },
        type: {
            type: String,
            required: true,
            enum: ["free", "onetime"],
        },
        oneTimeAmount: { type: Number },
        userId: { type: String, required: true },
        archived: { type: Boolean, default: false },
        internal: { type: Boolean, default: false },
    },
    {
        timestamps: true,
    },
);

const PaymentPlan = mongoose.model("PaymentPlan", PaymentPlanSchema);

export const UserSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    userId: { type: String, required: true },
});

const User = mongoose.model("User", UserSchema);

const MembershipSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        membershipId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        userId: { type: String, required: true },
        paymentPlanId: String,
        entityId: { type: String, required: true },
        entityType: {
            type: String,
            enum: ["course", "community"],
            required: true,
        },
        sessionId: { type: String, required: true, default: generateUniqueId },
        status: {
            type: String,
            enum: ["active", "pending"],
            default: "pending",
        },
    },
    {
        timestamps: true,
    },
);

const Membership = mongoose.model("Membership", MembershipSchema);

const PurchaseSchema = new mongoose.Schema({
    domain: { type: mongoose.Schema.Types.ObjectId, required: true },
    orderId: { type: String, required: true, default: generateUniqueId },
    courseId: { type: String, required: true },
    purchasedOn: { type: Date, required: true, default: () => new Date() },
    purchasedBy: { type: String, required: true },
    paymentMethod: { type: String, required: true },
    paymentId: { type: String },
    amount: { type: Number, required: true },
    currencyISOCode: { type: String, required: true },
    discount: { type: Number },
    status: { type: String, required: true, default: "initiated" },
    remark: { type: String },
});

const Purchase = mongoose.model("Purchase", PurchaseSchema);

const InvoiceSchema = new mongoose.Schema(
    {
        domain: { type: mongoose.Schema.Types.ObjectId, required: true },
        invoiceId: {
            type: String,
            required: true,
            unique: true,
            default: generateUniqueId,
        },
        membershipId: { type: String, required: true },
        membershipSessionId: { type: String, required: true },
        amount: { type: Number, required: true },
        status: {
            type: String,
            enum: ["pending", "paid", "failed"],
            default: "pending",
        },
        paymentProcessor: { type: String, required: true },
        paymentProcessorEntityId: { type: String },
        paymentProcessorTransactionId: { type: String },
        currencyISOCode: { type: String, required: true },
    },
    {
        timestamps: true,
    },
);

const Invoice = mongoose.model("Invoice", InvoiceSchema);

const migratePurchasesToInvoices = async () => {
    const purchases = await Purchase.find({});

    for (const purchase of purchases) {
        const membership = await Membership.findOne({
            domain: purchase.domain,
            userId: purchase.purchasedBy,
            entityId: purchase.courseId,
            entityType: "course",
        });

        if (membership) {
            const existingInvoice = await Invoice.findOne({
                domain: purchase.domain,
                membershipId: membership.membershipId,
                invoiceId: purchase.orderId,
            });
            if (existingInvoice) {
                console.log(
                    "Invoice already exists",
                    existingInvoice.invoiceId,
                );
                continue;
            }
            const invoicePayload = {
                domain: purchase.domain,
                invoiceId: purchase.orderId,
                membershipId: membership.membershipId,
                membershipSessionId: membership.sessionId,
                amount: purchase.amount,
                paymentProcessor: purchase.paymentMethod,
                paymentProcessorEntityId: purchase.paymentId,
                currencyISOCode: purchase.currencyISOCode,
            };
            await Invoice.create(invoicePayload);
        }
    }
};

(async () => {
    await migratePurchasesToInvoices();
    mongoose.connection.close();
})();
