import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Add01Icon, Loading03Icon } from '@hugeicons/core-free-icons'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { doApi } from '@/lib/api'

export default function DOExplorer() {
  const queryClient = useQueryClient()
  const [counterName, setCounterName] = useState('default')
  const [newCounterName, setNewCounterName] = useState('')

  const { data: counter, isLoading } = useQuery({
    queryKey: ['counter', counterName],
    queryFn: () => doApi.getCounter(counterName),
  })

  const incrementMutation = useMutation({
    mutationFn: () => doApi.increment(counterName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counter', counterName] })
    },
  })

  const decrementMutation = useMutation({
    mutationFn: () => doApi.decrement(counterName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counter', counterName] })
    },
  })

  const resetMutation = useMutation({
    mutationFn: () => doApi.reset(counterName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['counter', counterName] })
    },
  })

  const handleSwitchCounter = (e: React.FormEvent) => {
    e.preventDefault()
    if (newCounterName) {
      setCounterName(newCounterName)
      setNewCounterName('')
    }
  }

  const isPending =
    incrementMutation.isPending ||
    decrementMutation.isPending ||
    resetMutation.isPending

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Durable Objects</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Stateful counter demo using Durable Objects
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Counter: {counterName}</CardTitle>
            <CardDescription>
              Each named counter has its own persistent state
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center py-8">
              {isLoading ? (
                <p className="text-muted-foreground">Loading...</p>
              ) : (
                <div className="text-6xl font-bold text-primary">
                  {counter?.value ?? 0}
                </div>
              )}
            </div>

            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                size="lg"
                onClick={() => decrementMutation.mutate()}
                disabled={isPending}
              >
                <span className="text-lg font-bold">−</span>
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => resetMutation.mutate()}
                disabled={isPending}
              >
                <HugeiconsIcon icon={Loading03Icon} className="size-5" strokeWidth={2} />
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => incrementMutation.mutate()}
                disabled={isPending}
              >
                <HugeiconsIcon icon={Add01Icon} className="size-5" strokeWidth={2} />
              </Button>
            </div>

            <div className="flex justify-center gap-2">
              <Button
                variant="ghost"
                size="xs"
                onClick={() => decrementMutation.mutate()}
                disabled={isPending}
              >
                -1
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => resetMutation.mutate()}
                disabled={isPending}
              >
                Reset
              </Button>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => incrementMutation.mutate()}
                disabled={isPending}
              >
                +1
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Switch Counter</CardTitle>
            <CardDescription>
              Create or switch to a different named counter
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <form onSubmit={handleSwitchCounter} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="counter-name">Counter Name</Label>
                <Input
                  id="counter-name"
                  placeholder="my-counter"
                  value={newCounterName}
                  onChange={(e) => setNewCounterName(e.target.value)}
                />
              </div>
              <Button type="submit" disabled={!newCounterName}>
                Switch Counter
              </Button>
            </form>

            <div className="space-y-2">
              <Label>Quick Access</Label>
              <div className="flex flex-wrap gap-2">
                {['default', 'visits', 'likes', 'clicks'].map((name) => (
                  <Badge
                    key={name}
                    variant={counterName === name ? 'default' : 'outline'}
                    className="cursor-pointer"
                    onClick={() => setCounterName(name)}
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <h4 className="text-xs font-medium mb-2">How it works</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>Each counter name creates a unique Durable Object instance</li>
                <li>State persists across requests and restarts</li>
                <li>Counter value is stored in the DO's storage API</li>
                <li>Multiple counters can run independently</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
