import type { Metadata } from "next"

import { AdminDashboard } from "@/components/admin/AdminDashboard"
import { AdminGate } from "@/components/admin/AdminGate"

export const metadata: Metadata = {
  title: "Admin dashboard",
  robots: { index: false, follow: false },
}

export default function AdminPage() {
  return (
    <AdminGate>
      <AdminDashboard />
    </AdminGate>
  )
}
