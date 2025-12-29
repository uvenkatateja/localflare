import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Sent02Icon, TaskDone01Icon } from '@hugeicons/core-free-icons'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { queueApi } from '@/lib/api'

interface SentMessage {
  id: number
  content: unknown
  timestamp: Date
}

export default function QueuesExplorer() {
  const [messageType, setMessageType] = useState<'text' | 'json'>('text')
  const [textMessage, setTextMessage] = useState('')
  const [jsonMessage, setJsonMessage] = useState('{\n  "type": "task",\n  "data": "example"\n}')
  const [sentMessages, setSentMessages] = useState<SentMessage[]>([])

  const sendMutation = useMutation({
    mutationFn: queueApi.sendMessage,
    onSuccess: (_, variables) => {
      setSentMessages((prev) => [
        { id: Date.now(), content: variables, timestamp: new Date() },
        ...prev,
      ])
      if (messageType === 'text') {
        setTextMessage('')
      }
    },
  })

  const handleSendText = (e: React.FormEvent) => {
    e.preventDefault()
    if (textMessage) {
      sendMutation.mutate({ type: 'text', message: textMessage })
    }
  }

  const handleSendJson = (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const parsed = JSON.parse(jsonMessage)
      sendMutation.mutate(parsed)
    } catch {
      alert('Invalid JSON')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Queues</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Message queue for async task processing
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Send Message</CardTitle>
            <CardDescription>
              Send a message to the task-queue
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={messageType} onValueChange={(v) => setMessageType(v as 'text' | 'json')}>
              <TabsList className="mb-4">
                <TabsTrigger value="text">Text</TabsTrigger>
                <TabsTrigger value="json">JSON</TabsTrigger>
              </TabsList>

              <TabsContent value="text">
                <form onSubmit={handleSendText} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="text-message">Message</Label>
                    <Input
                      id="text-message"
                      placeholder="Enter your message..."
                      value={textMessage}
                      onChange={(e) => setTextMessage(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={sendMutation.isPending || !textMessage}>
                    <HugeiconsIcon icon={Sent02Icon} className="size-4" strokeWidth={2} />
                    Send Message
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="json">
                <form onSubmit={handleSendJson} className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="json-message">JSON Payload</Label>
                    <textarea
                      id="json-message"
                      className="w-full h-32 p-2 text-xs font-mono bg-muted rounded-lg border resize-none"
                      value={jsonMessage}
                      onChange={(e) => setJsonMessage(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={sendMutation.isPending}>
                    <HugeiconsIcon icon={Sent02Icon} className="size-4" strokeWidth={2} />
                    Send JSON
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sent Messages</CardTitle>
            <CardDescription>
              {sentMessages.length} messages sent this session
            </CardDescription>
          </CardHeader>
          <CardContent>
            {sentMessages.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No messages sent yet. Send a message to see it here.
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-auto">
                {sentMessages.map((msg) => (
                  <div key={msg.id} className="flex items-start gap-2 p-2 bg-muted rounded-lg">
                    <HugeiconsIcon icon={TaskDone01Icon} className="size-4 text-green-500 shrink-0 mt-0.5" strokeWidth={2} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">
                          Sent
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {msg.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs font-mono mt-1 whitespace-pre-wrap break-all">
                        {JSON.stringify(msg.content, null, 2)}
                      </pre>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Queue Configuration</CardTitle>
          <CardDescription>
            Current queue settings from wrangler.toml
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-xs font-medium mb-2">Producer</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Binding:</span>
                  <code>TASKS</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Queue:</span>
                  <code>task-queue</code>
                </div>
              </div>
            </div>
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-xs font-medium mb-2">Consumer</h4>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Batch Size:</span>
                  <code>10</code>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Batch Timeout:</span>
                  <code>5s</code>
                </div>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-4">
            Messages are processed by the queue consumer handler in the worker.
            Check the terminal logs to see messages being processed.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
