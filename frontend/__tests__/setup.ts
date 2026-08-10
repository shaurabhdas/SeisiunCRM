import { createClient } from '@supabase/supabase-js'
import { afterAll } from 'vitest'
import ws from 'ws'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_TEST_URL!,
  process.env.SUPABASE_TEST_SERVICE_KEY!,
  {
    db: { schema: 'test' },
    // `ws`'s typings declare `constructor(address: null)` as their first
    // overload (for server-mode sockets); TypeScript checks overloaded-
    // constructor assignability against only that first overload, so it
    // never matches realtime-js's single-signature WebSocketLikeConstructor
    // even though `ws` works correctly here at runtime as a client transport.
    realtime: { transport: ws as any }
  }
)

afterAll(async () => {
  await supabase.from('lead_activities').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('lead_stage_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('contacts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('leads').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('accounts').delete().neq('id', '00000000-0000-0000-0000-000000000000')
})
