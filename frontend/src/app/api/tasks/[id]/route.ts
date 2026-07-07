import { NextRequest, NextResponse } from 'next/server'
import { schemaStorage, supabase } from '@/lib/accounts'
import { updateTask, deleteTask } from '@/lib/tasks'
import { requireAuth } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { id } = await params
      const body = await request.json()

      // Fetch current task to check permissions
      const { data: task, error: fetchErr } = await supabase
        .from('tasks')
        .select('created_by, assigned_to')
        .eq('id', id)
        .single()

      if (fetchErr || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      // Permission check: creator, assignee, or manager/super_admin
      const isCreator = task.created_by === authUser.id
      const isAssignee = task.assigned_to === authUser.id
      const isManagerOrAbove = authUser.role === 'super_admin' || authUser.role === 'manager'

      if (!isCreator && !isAssignee && !isManagerOrAbove) {
        return NextResponse.json({ error: 'Forbidden: you do not have permission to update this task' }, { status: 403 })
      }

      const updated = await updateTask(id, body)
      return NextResponse.json(updated)
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const { id } = await params

      // Fetch current task to check permissions
      const { data: task, error: fetchErr } = await supabase
        .from('tasks')
        .select('created_by')
        .eq('id', id)
        .single()

      if (fetchErr || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 })
      }

      // Permission check: creator, or manager/super_admin
      const isCreator = task.created_by === authUser.id
      const isManagerOrAbove = authUser.role === 'super_admin' || authUser.role === 'manager'

      if (!isCreator && !isManagerOrAbove) {
        return NextResponse.json({ error: 'Forbidden: you do not have permission to delete this task' }, { status: 403 })
      }

      await deleteTask(id)
      return NextResponse.json({ success: true })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  })
}
