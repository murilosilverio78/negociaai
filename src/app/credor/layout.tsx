import { CredorLayout } from "@/components/credor/credor-layout";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Portal do Credor - Negocia Aí",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <CredorLayout>{children}</CredorLayout>
      <Toaster />
    </>
  );
}
