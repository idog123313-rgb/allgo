import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Heebo } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/lib/auth/context";
import { I18nProvider } from "@/lib/i18n/context";
import { LanguageSwitcher } from "@/components/shared/language-switcher";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import "./globals.css";

const sans = Plus_Jakarta_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const heebo = Heebo({
  variable: "--font-heebo",
  subsets: ["hebrew", "latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Allgo — Make the plan everyone can make.",
  description:
    "Send one link. Everyone adds their availability, budget and preferences. Allgo turns it into one plan everyone can agree on.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${heebo.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background">
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
          <I18nProvider>
            <AuthProvider>{children}</AuthProvider>
            <LanguageSwitcher />
            <ThemeToggle />
            <Toaster position="top-center" />
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
