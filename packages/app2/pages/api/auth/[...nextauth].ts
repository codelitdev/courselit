import NextAuth from "next-auth/next";
import EmailProvider from "next-auth/providers/email";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import connectToDatabase from "../../../services/db";

export default NextAuth({
    providers: [
        EmailProvider({
            server: {
                host: process.env.EMAIL_HOST,
                port: process.env.EMAIL_PORT,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            },
            from: process.env.EMAIL_FROM
        }),
    ],
    adapter: MongoDBAdapter(connectToDatabase()),
    debug: true
})