import { NextRequest, NextResponse } from 'next/server'
import { schemaStorage } from '@/lib/accounts'
import { fetchTasks, createTask } from '@/lib/tasks'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import ws from 'ws'

const adminClient = createAdminClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: { autoRefreshToken: false, persistSession: false },
    realtime: { transport: ws as any }
  }
)

export async function GET(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const tasks = await fetchTasks()
      return NextResponse.json(tasks)
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  })
}

export async function POST(request: NextRequest) {
  const schema = request.headers.get('x-supabase-schema') || 'public'
  return schemaStorage.run(schema, async () => {
    try {
      const authUser = await requireAuth()
      const body = await request.json()

      // Validate required fields
      if (!body.title || typeof body.title !== 'string' || body.title.trim() === '') {
        return NextResponse.json({ error: 'title is required and must be non-empty' }, { status: 400 })
      }

      // Validate priority if provided
      const validPriorities = ['low', 'medium', 'high', 'urgent']
      if (body.priority && !validPriorities.includes(body.priority)) {
        return NextResponse.json({ error: 'priority must be one of: low, medium, high, urgent' }, { status: 400 })
      }

      // Validate due_date if provided
      if (body.due_date) {
        const dateVal = new Date(body.due_date)
        if (isNaN(dateVal.getTime())) {
          return NextResponse.json({ error: 'due_date must be a valid date string' }, { status: 400 })
        }
      }

      // Validate assigned_to user exists and is active if provided
      let assignedTo = body.assigned_to || authUser.id
      let assignedToName = body.assigned_to_name || authUser.full_name

      if (body.assigned_to) {
        const { data: assigneeProfile } = await adminClient
          .from('user_profiles')
          .select('id, full_name, status')
          .eq('id', body.assigned_to)
          .single()

        if (!assigneeProfile || assigneeProfile.status !== 'active') {
          return NextResponse.json({ error: 'assigned_to user does not exist or is not active' }, { status: 400 })
        }
        assignedToName = body.assigned_to_name || assigneeProfile.full_name
      }

      const task = await createTask({
        title: body.title.trim(),
        description: body.description || null,
        assigned_to: assignedTo,
        assigned_to_name: assignedToName,
        created_by: authUser.id,
        created_by_name: authUser.full_name,
        priority: body.priority || 'medium',
        due_date: body.due_date || null,
        lead_id: body.lead_id || null,
        deal_id: body.deal_id || null,
        account_id: body.account_id || null,
      })

      return NextResponse.json(task, { status: 201 })
    } catch (err: any) {
      return NextResponse.json({ error: err.message }, { status: 500 })
    }
  })
}
