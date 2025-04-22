import type { Metadata } from "next";

export const RootMetadata: Metadata = {
  metadataBase: new URL("https://vaultic.is-cool.dev"),

  creator: "MI",
  applicationName: "Vaultic",
  authors: [{ name: "MI", url: "https://pixillium.is-cool.dev" }],

  keywords: ["2FA", "Authenticator", "2 Factor Authentication", "2FA Manager"],
  formatDetection: { telephone: false },
  referrer: "strict-origin-when-cross-origin",

  robots: {
    index: true,
    follow: true,
    "max-snippet": -1,
    indexifembedded: true,
    "max-video-preview": -1,
    "max-image-preview": "large",
  },

  openGraph: {
    url: "https://vaultic.is-cool.dev",
    locale: "en_US",
    type: "website",
    siteName: "Vaultic",
  },
  twitter: {
    card: "summary_large_image",

    site: "@pixillium_",
    creator: "@pixillium_",

    siteId: "1656717709663682560",
    creatorId: "1656717709663682560",
  },

  category: "2FA Manager",
  classification: "2FA Manager",

  other: {
    copyright: "© Vaultic 2025",
    "apple-mobile-web-app-title": "Vaultic",
  },
};
