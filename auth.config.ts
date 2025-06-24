import type { Config } from '@auth/core';
import Google from '@auth/core/providers/google';

export default {
  providers: [
    Google({
      clientId: import.meta.env.PUBLIC_GOOGLE_CLIENT_ID,
      // clientSecret: "",
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        token.accessToken = account.access_token;
        token.refreshToken = account.refresh_token;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.accessToken = token.accessToken;
        session.refreshToken = token.refreshToken;
      }
      return session;
    },
  },
} satisfies Config; 