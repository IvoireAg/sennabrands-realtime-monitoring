import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[240px_1fr] min-h-screen">
      <Sidebar />
      <div className="flex flex-col">
        <Topbar />
        <main className="p-8 max-w-[1600px] flex-1">{children}</main>
      </div>
    </div>
  )
}
