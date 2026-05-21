import { Outlet } from "react-router-dom";
import DisclaimerAckModal from "@/components/legal/DisclaimerAckModal";

/**
 * Root shell: first-visit disclaimer modal applies app-wide.
 * Dashboard and legal pages render via Outlet.
 */
export default function AppShell() {
  return (
    <>
      <DisclaimerAckModal />
      <Outlet />
    </>
  );
}
