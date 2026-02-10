import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, lastLoginMethod } from "better-auth/plugins";
import { db } from "@/lib/data/db";
import {
  generatePasswordResetEmailHtml,
  generateVerificationEmailHtml,
  sendEmail,
} from "@/lib/email";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url, token }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset Your Password",
        text: `Click the link to reset your password: ${url}`,
        html: generatePasswordResetEmailHtml(url),
      });
    },
    onPasswordReset: async ({ user }) => {
      console.log(`Password for user ${user.email} has been reset.`);
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Verify Your Email Address",
        text: `Click the link to verify your email: ${url}`,
        html: generateVerificationEmailHtml(url),
      });
    },
    callbackURL: "/registration/overview",
    autoSignInAfterVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
  plugins: [
    admin(), // For role-based access control
    nextCookies(), // Auto-set cookies in server actions
    lastLoginMethod(), // Track last authentication method used
  ],
});

export type Session = typeof auth.$Infer.Session;
