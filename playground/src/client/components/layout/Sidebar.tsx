import { NavLink } from 'react-router-dom'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Settings02Icon,
  Database02Icon,
  HardDriveIcon,
  Folder01Icon,
  Layers01Icon,
  TaskDone01Icon,
} from '@hugeicons/core-free-icons'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', icon: Settings02Icon, label: 'Home', color: 'text-foreground' },
  { to: '/d1', icon: Database02Icon, label: 'D1 Database', color: 'text-blue-500' },
  { to: '/kv', icon: HardDriveIcon, label: 'KV Store', color: 'text-green-500' },
  { to: '/r2', icon: Folder01Icon, label: 'R2 Storage', color: 'text-purple-500' },
  { to: '/do', icon: Layers01Icon, label: 'Durable Objects', color: 'text-yellow-500' },
  { to: '/queues', icon: TaskDone01Icon, label: 'Queues', color: 'text-pink-500' },
]

export default function Sidebar() {
  return (
    <div className="w-56 border-r bg-sidebar flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-sm font-semibold text-sidebar-foreground">
          LocalFlare Playground
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Demo & Testing
        </p>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                isActive
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-muted-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )
            }
          >
            <HugeiconsIcon icon={item.icon} className={cn('size-4', item.color)} strokeWidth={2} />
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <p className="text-xs text-muted-foreground">
          Powered by LocalFlare
        </p>
      </div>
    </div>
  )
}
