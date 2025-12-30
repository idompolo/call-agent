import type { Metadata } from "next"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { QueryProvider } from "@/components/query-provider"
import { ActionServiceInitializer } from "@/components/action-service-initializer"
import { UpdateBanner } from "@/components/update-banner"
import { WhatsNewModal } from "@/components/whats-new-modal"

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
      <body className="font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <ActionServiceInitializer>
              {children}
              <UpdateBanner />
              <WhatsNewModal />
            </ActionServiceInitializer>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}