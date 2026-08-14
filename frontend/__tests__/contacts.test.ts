import { describe, it, expect } from 'vitest'
import { restrictToAssociationFields } from '@/lib/contacts'

describe('restrictToAssociationFields', () => {
  it('keeps only leadId/accountId/dealId when a full edit payload is submitted', () => {
    const restricted = restrictToAssociationFields({
      name: 'Jane Smith',
      phone: '555-0100',
      email: 'jane@example.com',
      organization: 'Acme Corp',
      stakeholderRole: 'champion',
      leadId: 'lead-1',
      accountId: 'account-1',
      dealId: 'deal-1',
    })

    expect(restricted).toEqual({
      leadId: 'lead-1',
      accountId: 'account-1',
      dealId: 'deal-1',
    })
  })

  it('only echoes back association keys that were actually present in the input', () => {
    const restricted = restrictToAssociationFields({
      name: 'Attempted name change',
      leadId: 'lead-2',
    })

    expect(restricted).toEqual({ leadId: 'lead-2' })
    expect(restricted).not.toHaveProperty('accountId')
    expect(restricted).not.toHaveProperty('dealId')
    expect(restricted).not.toHaveProperty('name')
  })

  it('allows clearing an association by passing null', () => {
    const restricted = restrictToAssociationFields({
      dealId: null,
    })

    expect(restricted).toEqual({ dealId: null })
  })
})
