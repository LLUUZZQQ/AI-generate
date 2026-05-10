import "next-auth";

declare module "next-auth" {
  interface User {
    credits?: number;
  }
  interface Session {
    user: {
      id: string;
      credits?: number;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}
