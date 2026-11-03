import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CYNES Reporting",
  description: "Rapports de performances Instagram",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
