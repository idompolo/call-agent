import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { ActionServiceInitializer } from "@/components/action-service-initializer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "택시 관제 시스템",
  description: "실시간 택시 매칭 및 관제 서비스",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <ActionServiceInitializer>
              {children}
            </ActionServiceInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}