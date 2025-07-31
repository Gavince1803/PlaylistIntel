import NextAuth from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    error?: string
    user?: {
      id?: string
      name?: string | null
      email?: string | null
      image?: string | null
      product?: string
    }
  }

  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string
    refreshToken?: string
    expiresAt?: number
  }
} 