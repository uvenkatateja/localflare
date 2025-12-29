import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import {
  Database02Icon,
  HardDriveIcon,
  Folder01Icon,
  Layers01Icon,
  TaskDone01Icon,
} from '@hugeicons/core-free-icons'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { d1Api, kvApi, r2Api } from '@/lib/api'

const services = [
  {
    to: '/d1',
    icon: Database02Icon,
    title: 'D1 Database',
    description: 'SQLite database with users and posts',
    color: 'bg-blue-500/10 text-blue-600',
  },
  {
    to: '/kv',
    icon: HardDriveIcon,
    title: 'KV Store',
    description: 'Key-value storage for caching',
    color: 'bg-green-500/10 text-green-600',
  },
  {
    to: '/r2',
    icon: Folder01Icon,
    title: 'R2 Storage',
    description: 'Object storage for files',
    color: 'bg-purple-500/10 text-purple-600',
  },
  {
    to: '/do',
    icon: Layers01Icon,
    title: 'Durable Objects',
    description: 'Stateful counter demo',
    color: 'bg-orange-500/10 text-orange-600',
  },
  {
    to: '/queues',
    icon: TaskDone01Icon,
    title: 'Queues',
    description: 'Message queue for async tasks',
    color: 'bg-pink-500/10 text-pink-600',
  },
]

export default function Home() {
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: d1Api.getUsers,
  })

  const { data: kvKeys } = useQuery({
    queryKey: ['kv-keys'],
    queryFn: () => kvApi.listKeys(),
  })

  const { data: files } = useQuery({
    queryKey: ['files'],
    queryFn: () => r2Api.listFiles(),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">LocalFlare Playground</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test and explore Cloudflare Workers bindings locally
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => (
          <Link key={service.to} to={service.to}>
            <Card className="h-full hover:ring-2 hover:ring-primary/20 transition-all cursor-pointer">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${service.color}`}>
                    <HugeiconsIcon icon={service.icon} className="size-5" strokeWidth={2} />
                  </div>
                  <div>
                    <CardTitle>{service.title}</CardTitle>
                    <CardDescription>{service.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {service.to === '/d1' && users && (
                  <Badge variant="secondary">{users.length} users</Badge>
                )}
                {service.to === '/kv' && kvKeys && (
                  <Badge variant="secondary">{kvKeys.keys.length} keys</Badge>
                )}
                {service.to === '/r2' && files && (
                  <Badge variant="secondary">{files.objects.length} files</Badge>
                )}
                {service.to === '/do' && (
                  <Badge variant="secondary">Counter DO</Badge>
                )}
                {service.to === '/queues' && (
                  <Badge variant="secondary">task-queue</Badge>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>
            This playground demonstrates all LocalFlare-supported Cloudflare bindings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">D1 Database:</strong> Pre-populated with users and posts tables. Try adding or deleting records.
          </p>
          <p>
            <strong className="text-foreground">KV Store:</strong> Create, read, update, and delete key-value pairs with optional TTL.
          </p>
          <p>
            <strong className="text-foreground">R2 Storage:</strong> Upload, download, and manage files in object storage.
          </p>
          <p>
            <strong className="text-foreground">Durable Objects:</strong> Test the counter DO with increment, decrement, and reset operations.
          </p>
          <p>
            <strong className="text-foreground">Queues:</strong> Send messages to the task queue and see them processed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
