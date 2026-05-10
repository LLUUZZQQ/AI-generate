"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "next-themes";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SessionProvider>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster
            theme="dark"
            toastOptions={{
              style: {
                background: "rgba(20,20,35,0.95)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#f0f0f5",
                fontSize: "13px",
                borderRadius: "12px",
                backdropFilter: "blur(16px)",
              },
            }}
          />
        </QueryClientProvider>
      </SessionProvider>
    </ThemeProvider>
  );
}
