import { Navigate, Route, Routes } from "react-router-dom"

import { AppLayout } from "@/components/layout/AppLayout"
import { Dashboard } from "@/pages/Dashboard"
import { Upload } from "@/pages/Upload"
import { Invoices } from "@/pages/Invoices"
import { Contracts } from "@/pages/Contracts"
import { Settings } from "@/pages/Settings"

function App() {
  return (
    <Routes>
      <Route path="/" element={<AppLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="upload" element={<Upload />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="settings" element={<Settings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
