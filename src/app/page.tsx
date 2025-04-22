import SearchBar from "@/components/base/search-bar";
import SettingsButton from "@/components/base/settings-button";
import AuthenticatorGrid from "@/components/base/authenticator-grid";
import AddAuthenticatorButton from "@/components/base/add-authenticator";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Vaultic - 2FA Manager",
  description:
    "A privacy-focused 2FA manager that stores all data locally in your browser",
};

export default function Home() {
  return (
    <>
      <SettingsButton />
      <main className="mx-auto p-4 space-y-6 max-w-dvw overflow-x-hidden">
        <div className="rounded-4xl border-2 border-lime-400 flex flex-col md:items-center justify-center bg-gradient-to-b from-lime-500 to-background h-96 gap-5 md:text-center text-left px-10">
          <h1 className="text-5xl md:text-6xl font-medium tracking-tighter">
            Vaultic - 2FA Manager
          </h1>
          <p className="opacity-50 md:text-lg tracking-tight max-w-xl">
            A privacy-focused authenticator manager that stores all data locally
            in your browser. Free and open source.
          </p>
        </div>
        <div className="flex flex-col md:flex-row gap-2 items-start md:items-center w-full max-w-dvw">
          <SearchBar />
          <AddAuthenticatorButton />
        </div>
        <AuthenticatorGrid />
      </main>
    </>
  );
}
