import { Metadata } from "next";
import Main from "@/components/base/main";

export const metadata: Metadata = {
  title: "Vaultic: Secure 2FA Manager – Private, In-Browser, Backup Support",
  description:
    "Manage all your 2FA codes securely in your browser. No cloud, no tracking. Export backups to stay safe across devices. 100% private.",
  openGraph: {
    title: "Vaultic: Secure 2FA Manager – Private, In-Browser, Backup Support",
    description:
      "Manage all your 2FA codes securely in your browser. No cloud, no tracking. Export backups to stay safe across devices. 100% private.",
    url: "https://vaultic.is-cool.dev",
    images: [
      {
        url: "/thumbnail.png",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Vaultic: Secure 2FA Manager – Private, In-Browser, Backup Support",
    description:
      "Manage all your 2FA codes securely in your browser. No cloud, no tracking. Export backups to stay safe across devices. 100% private.",
    images: ["/thumbnail.png"],
  },
};

export default function Home() {
  return <Main />;
}
