import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, File01Icon, Download01Icon, Search01Icon } from '@hugeicons/core-free-icons'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { r2Api, type R2Object } from '@/lib/api'
import { formatBytes, formatDate } from '@/lib/utils'

export default function R2Explorer() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [prefix, setPrefix] = useState('')

  const { data: files, isLoading } = useQuery({
    queryKey: ['files', prefix],
    queryFn: () => r2Api.listFiles(prefix || undefined),
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      return r2Api.uploadFile(file.name, file)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: r2Api.deleteFile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      uploadMutation.mutate(file)
    }
  }

  const handleDownload = (key: string) => {
    window.open(r2Api.downloadFile(key), '_blank')
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">R2 Storage</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Object storage for files and assets
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload File</CardTitle>
          <CardDescription>Upload a file to R2 storage</CardDescription>
        </CardHeader>
        <CardContent>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            className="hidden"
          />
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadMutation.isPending}
          >
            <HugeiconsIcon icon={File01Icon} className="size-4" strokeWidth={2} />
            {uploadMutation.isPending ? 'Uploading...' : 'Select File'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Files</CardTitle>
          <CardDescription>
            {files?.objects.length ?? 0} files in bucket
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
          ) : files?.objects.length === 0 ? (
            <p className="text-sm text-muted-foreground">No files found</p>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted">
                  <tr>
                    <th className="text-left p-2 font-medium">Key</th>
                    <th className="text-left p-2 font-medium">Size</th>
                    <th className="text-left p-2 font-medium">Uploaded</th>
                    <th className="p-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {files?.objects.map((file: R2Object) => (
                    <tr key={file.key} className="border-t">
                      <td className="p-2 font-mono">{file.key}</td>
                      <td className="p-2 text-muted-foreground">
                        {formatBytes(file.size)}
                      </td>
                      <td className="p-2 text-muted-foreground">
                        {formatDate(file.uploaded)}
                      </td>
                      <td className="p-2">
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => handleDownload(file.key)}
                          >
                            <HugeiconsIcon icon={Download01Icon} className="size-3" strokeWidth={2} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => deleteMutation.mutate(file.key)}
                            disabled={deleteMutation.isPending}
                          >
                            <HugeiconsIcon icon={Delete02Icon} className="size-3 text-destructive" strokeWidth={2} />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
