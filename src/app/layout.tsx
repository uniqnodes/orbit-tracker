import type { Metadata } from "next";
import "./styles.css";

export const metadata: Metadata = {
  title: "ORBIT",
  description: "Operational Repository Branch Insight Tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
