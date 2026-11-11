import type { Metadata } from "next";
import { Instrument_Serif, Jost } from "next/font/google";
import AppShell from "@/components/AppShell";
import "./globals.css";

const jost = Jost({ variable: "--font-jost", subsets: ["latin"] });
const instrument = Instrument_Serif({ variable: "--font-instrument", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: { default: "Ode To Odd ERP", template: "%s · Ode To Odd ERP" },
  description: "Prototype of the Ode To Odd ERP: inventory, production, orders and karigars in one place. Sample data.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${jost.variable} ${instrument.variable} h-full antialiased`}>
      <body className="min-h-full">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
