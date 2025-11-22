import { betterAuth } from "better-auth";
import { emailOTP } from "better-auth/plugins";
import { createMultitenantAdapter } from "./auth-adapter";
import { hashCode } from "@/lib/utils";
import VerificationToken from "@/models/VerificationToken";
import DomainModel, { Domain } from "@/models/Domain";
import pug from "pug";
import MagicCodeEmailTemplate from "@/templates/magic-code-email";
import { generateEmailFrom } from "@/lib/utils";
import { addMailJob } from "@/services/queue";

export const auth = betterAuth({
  database: createMultitenantAdapter({
    getDomainFromRequest: async (request: Request) => {
      return request.headers.get("domain");
    },
  }),
  
  plugins: [
    emailOTP({
      async sendVerificationOTP({ email, otp, type, request }) {
        const domainName = request?.headers.get("domain");
        if (!domainName) {
          throw new Error("Domain not found");
        }

        const domain = await DomainModel.findOne<Domain>({
          name: domainName,
        });
        
        if (!domain) {
          throw new Error("Domain not found");
        }

        const sanitizedEmail = email.toLowerCase();

        // Store the OTP in our verification token system
        await VerificationToken.create({
          domain: domain.name,
          email: sanitizedEmail,
          code: hashCode(parseInt(otp)),
          timestamp: Date.now() + 1000 * 60 * 5, // 5 minutes expiry
        });

        try {
          const emailBody = pug.render(MagicCodeEmailTemplate, {
            code: otp,
            hideCourseLitBranding: domain.settings?.hideCourseLitBranding,
          });

          const host = request?.headers.get("host") || domain.name;
          
          await addMailJob({
            to: [sanitizedEmail],
            subject: `Sign in to ${host}`,
            body: emailBody,
            from: generateEmailFrom({
              name: domain?.settings?.title || domain.name,
              email: process.env.EMAIL_FROM || domain.email,
            }),
          });
        } catch (err: any) {
          throw new Error(`Failed to send email: ${err.message}`);
        }
      },
      
      otpLength: 6,
      expiresIn: 300, // 5 minutes
      allowedAttempts: 3,
    }),
  ],
  
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  
  user: {
    additionalFields: {
      domain: {
        type: "string",
        required: true,
      },
      userId: {
        type: "string",
        required: true,
      },
      active: {
        type: "boolean",
        required: true,
        defaultValue: true,
      },
      invited: {
        type: "boolean",
        required: true,
        defaultValue: false,
      },
    },
  },
  
  callbacks: {
    async signIn({ user, request }) {
      const domainName = request?.headers.get("domain");
      if (!domainName) {
        throw new Error("Domain not found");
      }

      const domain = await DomainModel.findOne<Domain>({
        name: domainName,
      });
      
      if (!domain) {
        throw new Error("Domain not found");
      }

      // Check if user is active
      if (!user.active) {
        throw new Error("User account is inactive");
      }

      return true;
    },
  },
});

export type Session = typeof auth.$Infer.Session;
