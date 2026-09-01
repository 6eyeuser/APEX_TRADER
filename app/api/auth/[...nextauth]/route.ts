export const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  // YOU MUST ADD THIS BLOCK:
  session: {
    strategy: "jwt", 
  },
  // ... rest of your config
}