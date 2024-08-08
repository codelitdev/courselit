import { paymentMethods } from "./constants";

export type PaymentMethod = (typeof paymentMethods)[number];
