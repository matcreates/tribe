import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { getUserByEmail, verifyPassword, createTribe, getTribeByUserId } from "./db";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await getUserByEmail(email);
        
        if (!user) {
          return null;
        }

        const isValidPassword = verifyPassword(password, user.password);
        
        if (!isValidPassword) {
          return null;
        }

        // Ensure user has a tribe
        let tribe = await getTribeByUserId(user.id);
        if (!tribe) {
          const slug = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
          tribe = await createTribe(user.id, "My Tribe", slug, user.name || "Anonymous");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          tribeId: tribe.id,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.tribeId = (user as { tribeId?: string }).tribeId;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as { tribeId?: string }).tribeId = token.tribeId as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  trustHost: true,
});
