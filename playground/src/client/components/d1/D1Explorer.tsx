import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { HugeiconsIcon } from '@hugeicons/react'
import { Delete02Icon, Add01Icon } from '@hugeicons/core-free-icons'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { d1Api, type User, type Post } from '@/lib/api'

export default function D1Explorer() {
  const queryClient = useQueryClient()
  const [newUser, setNewUser] = useState({ email: '', name: '', role: 'user' })

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: d1Api.getUsers,
  })

  const { data: posts, isLoading: postsLoading } = useQuery({
    queryKey: ['posts'],
    queryFn: d1Api.getPosts,
  })

  const createUserMutation = useMutation({
    mutationFn: d1Api.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setNewUser({ email: '', name: '', role: 'user' })
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: d1Api.deleteUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      queryClient.invalidateQueries({ queryKey: ['posts'] })
    },
  })

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault()
    if (newUser.email && newUser.name) {
      createUserMutation.mutate(newUser)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">D1 Database</h1>
        <p className="text-sm text-muted-foreground mt-1">
          SQLite database with users and posts
        </p>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="posts">Posts</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Add User</CardTitle>
              <CardDescription>Create a new user in the database</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateUser} className="flex gap-3 items-end">
                <div className="space-y-1">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="user@example.com"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    placeholder="John Doe"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="role">Role</Label>
                  <Input
                    id="role"
                    placeholder="user"
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  />
                </div>
                <Button type="submit" disabled={createUserMutation.isPending}>
                  <HugeiconsIcon icon={Add01Icon} className="size-4" strokeWidth={2} />
                  Add User
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>
                {users?.length ?? 0} users in database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-2 font-medium">ID</th>
                        <th className="text-left p-2 font-medium">Email</th>
                        <th className="text-left p-2 font-medium">Name</th>
                        <th className="text-left p-2 font-medium">Role</th>
                        <th className="text-left p-2 font-medium">Created</th>
                        <th className="p-2"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {users?.map((user: User) => (
                        <tr key={user.id} className="border-t">
                          <td className="p-2">{user.id}</td>
                          <td className="p-2">{user.email}</td>
                          <td className="p-2">{user.name}</td>
                          <td className="p-2">
                            <Badge variant="secondary">{user.role}</Badge>
                          </td>
                          <td className="p-2 text-muted-foreground">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-2">
                            <Button
                              variant="ghost"
                              size="icon-xs"
                              onClick={() => deleteUserMutation.mutate(user.id)}
                              disabled={deleteUserMutation.isPending}
                            >
                              <HugeiconsIcon icon={Delete02Icon} className="size-3 text-destructive" strokeWidth={2} />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="posts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Posts</CardTitle>
              <CardDescription>
                {posts?.length ?? 0} posts in database
              </CardDescription>
            </CardHeader>
            <CardContent>
              {postsLoading ? (
                <p className="text-sm text-muted-foreground">Loading...</p>
              ) : (
                <div className="space-y-3">
                  {posts?.map((post: Post) => (
                    <div key={post.id} className="border rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-sm">{post.title}</h3>
                        <Badge variant="outline">{post.author_name}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {post.content}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(post.created_at).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
