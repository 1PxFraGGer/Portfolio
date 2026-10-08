
import type { Metadata } from "next";
import "./globals.css";
import DimensionTravelProvider from "@/components/experience/DimensionTravelProvider";

export const metadata: Metadata = {
  title: "Beyond the Code | Interactive Developer Portfolio",
  description:
    "Explore a cinematic developer portfolio showcasing frontend development, backend engineering, technical SEO and content strategy.",
  keywords: [
    "Full Stack Developer",
    "Frontend Developer",
    "Backend Developer",
    "React Developer",
    "API Integration",
    "Technical SEO",
    "Content Writer",
    "Interactive Portfolio",
  ],
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-scroll-behavior="smooth">
      <body><DimensionTravelProvider>{children}</DimensionTravelProvider></body>
    </html>
  );
}
