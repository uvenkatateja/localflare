import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Add01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { kvApi, type KVKey } from '@/lib/api'

export default function KVExplorer() {
  const queryClient = useQueryClient()
  const [prefix, setPrefix] = useState('')
  const [newKey, setNewKey] = useState({ key: '', value: '', ttl: '' })
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  const { data: keys, isLoading } = useQuery({
    queryKey: ['kv-keys', prefix],
    queryFn: () => kvApi.listKeys(prefix || undefined),
  })

  const { data: selectedValue } = useQuery({
    queryKey: ['kv-value', selectedKey],
    queryFn: () => kvApi.getValue(selectedKey!),
    enabled: !!selectedKey,
  })

  const setValueMutation = useMutation({
    mutationFn: () =>
      kvApi.setValue(
        newKey.key,
        newKey.value,
        newKey.ttl ? parseInt(newKey.ttl) : undefined
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kv-keys'] })
      setNewKey({ key: '', value: '', ttl: '' })
    },
  })

  const deleteKeyMutation = useMutation({
    mutationFn: kvApi.deleteKey,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kv-keys'] })
      if (selectedKey) {
        setSelectedKey(null)
      }
    },
  })

  const handleSetValue = (e: React.FormEvent) => {
    e.preventDefault()
    if (newKey.key && newKey.value) {
      setValueMutation.mutate()
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">KV Store</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Key-value storage for caching and configuration
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add/Update Key</CardTitle>
              <CardDescription>Set a key-value pair in KV storage</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSetValue} className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="key">Key</Label>
                  <Input
                    id="key"
                    placeholder="my-key"
                    value={newKey.key}
                    onChange={(e) => setNewKey({ ...newKey, key: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="value">Value</Label>
                  <Input
                    id="value"
                    placeholder="my-value"
                    value={newKey.value}
                    onChange={(e) => setNewKey({ ...newKey, value: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="ttl">TTL (seconds, optional)</Label>
                  <Input
                    id="ttl"
                    type="number"
                    placeholder="3600"
                    value={newKey.ttl}
                    onChange={(e) => setNewKey({ ...newKey, ttl: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={setValueMutation.isPending}>
                  <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
                  Set Value
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Keys</CardTitle>
              <CardDescription>
                {keys?.keys.length ?? 0} keys in namespace
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Filter by prefix..."
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                />
                <Button variant="outline" size="icon">
                  <HugeiconsIcon icon={Search01Icon} className="size-4" strokeWidth={2} />
                </Button>
              </div>
              {isLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : keys?.keys.length === 0 ? (
                <p className="text-sm text-muted-foreground">No keys found</p>
              ) : (
                <div className="border rounded-lg divide-y max-h-64 overflow-auto">
                  {keys?.keys.map((key: KVKey) => (
                    <div
                      key={key.name}
                      className={`flex items-center justify-between p-2 cursor-pointer hover:bg-muted transition-colors ${
                        selectedKey === key.name ? 'bg-muted' : ''
                      }`}
                      onClick={() => setSelectedKey(key.name)}
                    >
                      <span className="text-xs font-mono truncate">{key.name}</span>
                      <Button
                        variant="ghost"
                        size="icon-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteKeyMutation.mutate(key.name)
                        }}
                        disabled={deleteKeyMutation.isPending}
                      >
                        <HugeiconsIcon icon={Delete02Icon} className="size-3 text-destructive" strokeWidth={2} />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Value</CardTitle>
            <CardDescription>
              {selectedKey ? `Value for "${selectedKey}"` : 'Select a key to view its value'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedKey && selectedValue ? (
              <div className="space-y-2">
                <Label>Key</Label>
                <div className="p-2 bg-muted rounded-lg font-mono text-xs">
                  {selectedKey}
                </div>
                <Label>Value</Label>
                <div className="p-2 bg-muted rounded-lg font-mono text-xs whitespace-pre-wrap break-all min-h-32">
                  {selectedValue.value}
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Click on a key to view its value
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
