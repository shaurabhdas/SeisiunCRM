import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with Forecast Pulse extensions...');

  // Clean DB
  await prisma.dealSnapshot.deleteMany({});
  await prisma.stageWeight.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.deal.deleteMany({});
  await prisma.contact.deleteMany({});

  // Seed Stage Weights
  await prisma.stageWeight.createMany({
    data: [
      { stage: 'Qualified', probability: 0.42 },
      { stage: 'Discovery', probability: 0.57 },
      { stage: 'Proposal', probability: 0.63 },
      { stage: 'Negotiation', probability: 0.78 },
    ],
  });

  // Seed Contacts
  const contact1 = await prisma.contact.create({
    data: {
      name: 'Olivia Martin',
      email: 'olivia.martin@email.com',
      phone: '+1 (555) 019-2834',
      company: 'Northstar Labs',
      status: 'Customer',
    },
  });

  const contact2 = await prisma.contact.create({
    data: {
      name: 'Jackson Lee',
      email: 'jackson.lee@email.com',
      phone: '+1 (555) 014-3928',
      company: 'Mercury Retail',
      status: 'SQL',
    },
  });

  const contact3 = await prisma.contact.create({
    data: {
      name: 'Isabella Nguyen',
      email: 'isabella.nguyen@email.com',
      phone: '+1 (555) 012-9843',
      company: 'Stark Industries',
      status: 'MQL',
    },
  });

  const contact4 = await prisma.contact.create({
    data: {
      name: 'William Kim',
      email: 'will@email.com',
      phone: '+1 (555) 017-4820',
      company: 'Acme Corp',
      status: 'Lead',
    },
  });

  const contact5 = await prisma.contact.create({
    data: {
      name: 'Sofia Davis',
      email: 'sofia.davis@email.com',
      phone: '+1 (555) 015-8392',
      company: 'Expansion Inc',
      status: 'Customer',
    },
  });

  // Seed 14 Open Deals to match $621K Best Case, $148K Likely Slip, and ~$392K Commit Forecast
  const dealData = [
    // 1. Northstar Labs (Qualified, $96K, manualProbability: 90)
    {
      name: 'Northstar Labs',
      value: 96000.0,
      stage: 'Qualified',
      priority: 'High',
      contactId: contact1.id,
      expectedCloseDate: new Date('2026-07-01'),
      nextAction: 'Send redline summary today',
      manualProbability: 90,
      pushedCount: 0,
    },
    // 2. Mercury Retail (Discovery, $118K, customRiskText: "No technical meeting booked")
    {
      name: 'Mercury Retail',
      value: 118000.0,
      stage: 'Discovery',
      priority: 'Medium',
      contactId: contact2.id,
      expectedCloseDate: new Date('2026-08-15'),
      nextAction: 'Send redline s',
      customRiskText: 'No technical meeting booked',
      pushedCount: 0,
    },
    // 3. Northstar Labs Proposal (Proposal, $96K)
    {
      name: 'Northstar Labs Proposal',
      value: 96000.0,
      stage: 'Proposal',
      priority: 'High',
      contactId: contact1.id,
      expectedCloseDate: new Date('2026-07-15'),
      nextAction: 'bid summary today',
      pushedCount: 0,
    },
    // 4. Expansion (Negotiation, $118K)
    {
      name: 'Expansion',
      value: 118000.0,
      stage: 'Negotiation',
      priority: 'High',
      contactId: contact5.id,
      expectedCloseDate: new Date('2026-06-30'),
      nextAction: 'Send discoavery',
      pushedCount: 0,
    },
    // 5-9. Slipped Deals (Need executive action, total value $148K)
    {
      name: 'Slipped Opportunity A',
      value: 40000.0,
      stage: 'Discovery',
      priority: 'High',
      contactId: contact3.id,
      expectedCloseDate: new Date('2026-09-01'),
      nextAction: 'Re-engage stakeholder',
      pushedCount: 2,
    },
    {
      name: 'Slipped Opportunity B',
      value: 30000.0,
      stage: 'Qualified',
      priority: 'Medium',
      contactId: contact4.id,
      expectedCloseDate: new Date('2026-08-01'),
      nextAction: 'Verify budget authority',
      pushedCount: 2,
    },
    {
      name: 'Slipped Opportunity C',
      value: 28000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact2.id,
      expectedCloseDate: new Date('2026-08-10'),
      nextAction: 'Schedule intro call',
      pushedCount: 2,
    },
    {
      name: 'Slipped Opportunity D',
      value: 25000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact1.id,
      expectedCloseDate: new Date('2026-07-20'),
      nextAction: 'Send case studies',
      pushedCount: 2,
    },
    {
      name: 'Slipped Opportunity E',
      value: 25000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact4.id,
      expectedCloseDate: new Date('2026-07-25'),
      nextAction: 'Send pricing summary',
      pushedCount: 2,
    },
    // 10-14. Other minor open deals (total value $45K to hit $621K Best Case)
    {
      name: 'Acme Minor Deal',
      value: 10000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact4.id,
      expectedCloseDate: new Date('2026-08-20'),
      nextAction: 'Follow up email',
      pushedCount: 0,
    },
    {
      name: 'Stark Minor Deal',
      value: 10000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact3.id,
      expectedCloseDate: new Date('2026-08-25'),
      nextAction: 'Follow up email',
      pushedCount: 0,
    },
    {
      name: 'Wayne Minor Deal',
      value: 10000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact1.id,
      expectedCloseDate: new Date('2026-09-10'),
      nextAction: 'Send product brief',
      pushedCount: 0,
    },
    {
      name: 'Cyberdyne Minor Deal',
      value: 10000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact2.id,
      expectedCloseDate: new Date('2026-09-15'),
      nextAction: 'Send product brief',
      pushedCount: 0,
    },
    {
      name: 'Initech Minor Deal',
      value: 5000.0,
      stage: 'Qualified',
      priority: 'Low',
      contactId: contact2.id,
      expectedCloseDate: new Date('2026-09-20'),
      nextAction: 'Follow up next week',
      pushedCount: 0,
    },
    // 15. Closed Won Deal to reach $392K Commit Forecast
    {
      name: 'Acme Closed Deal',
      value: 19810.0,
      stage: 'Closed Won',
      priority: 'Low',
      contactId: contact4.id,
      expectedCloseDate: new Date('2026-06-10'),
      nextAction: 'Onboarding completed',
      pushedCount: 0,
    },
  ];

  const createdDeals = [];
  for (const data of dealData) {
    const deal = await prisma.deal.create({ data });
    createdDeals.push(deal);
  }

  // Seed Activity Logs to calculate "activity velocity" and trigger some automated risk flags
  // Let's add some meetings and calls to avoid some deals becoming "stale" or "no meeting"
  await prisma.activityLog.createMany({
    data: [
      { type: 'Meeting', content: 'Technical validation call with champion.', contactId: contact1.id, createdAt: new Date('2026-06-12T10:00:00Z') },
      { type: 'Email', content: 'Sent redline draft.', contactId: contact1.id, createdAt: new Date('2026-06-13T14:30:00Z') },
      { type: 'Call', content: 'Follow up on redlines.', contactId: contact1.id, createdAt: new Date('2026-06-14T09:00:00Z') },
      // Mercury Retail contact2 has no meetings logged -> will trigger "No technical meeting booked" if stage is Discovery or later
      { type: 'Email', content: 'Sent intro pitch deck.', contactId: contact2.id, createdAt: new Date('2026-06-11T15:00:00Z') },
    ],
  });

  // Seed Sunday Snapshots to compare against current state
  // We want to seed snapshot values that trigger the correct trend indicators:
  // - Northstar Labs 1: Value $96K (snapshot: $96K -> unchanged value `→`, stage Qualified -> unchanged step `•`)
  // - Mercury Retail: Value $118K (snapshot: $118K -> unchanged value `→`, stage Discovery -> unchanged step `•`)
  // - Northstar Labs Proposal: Value $96K (snapshot: $96K -> unchanged value `→`, stage: Discovery -> progressed stage `↑`!)
  // - Expansion: Value $118K (snapshot: $128K -> decreased value `↘`, stage: Negotiation -> unchanged step `•`)
  const snapshotDate = new Date('2026-06-14T23:59:59Z'); // Last Sunday

  await prisma.dealSnapshot.createMany({
    data: [
      {
        dealId: createdDeals[0].id,
        name: createdDeals[0].name,
        value: 96000.0,
        stage: 'Qualified',
        expectedCloseDate: new Date('2026-07-01'),
        snapshotDate,
      },
      {
        dealId: createdDeals[1].id,
        name: createdDeals[1].name,
        value: 118000.0,
        stage: 'Discovery',
        expectedCloseDate: new Date('2026-08-15'),
        snapshotDate,
      },
      {
        dealId: createdDeals[2].id,
        name: createdDeals[2].name,
        value: 96000.0,
        stage: 'Discovery', // Progressed to Proposal
        expectedCloseDate: new Date('2026-07-15'),
        snapshotDate,
      },
      {
        dealId: createdDeals[3].id,
        name: createdDeals[3].name,
        value: 128000.0, // Value decreased to 118K
        stage: 'Negotiation',
        expectedCloseDate: new Date('2026-06-30'),
        snapshotDate,
      },
      // Slipped deals snapshots (values same, but expected close dates changed or slipped)
      {
        dealId: createdDeals[4].id,
        name: createdDeals[4].name,
        value: 40000.0,
        stage: 'Discovery',
        expectedCloseDate: new Date('2026-07-01'), // Close date slipped
        snapshotDate,
      },
      {
        dealId: createdDeals[5].id,
        name: createdDeals[5].name,
        value: 30000.0,
        stage: 'Qualified',
        expectedCloseDate: new Date('2026-06-01'), // Close date slipped
        snapshotDate,
      },
      {
        dealId: createdDeals[6].id,
        name: createdDeals[6].name,
        value: 28000.0,
        stage: 'Qualified',
        expectedCloseDate: new Date('2026-06-10'), // Close date slipped
        snapshotDate,
      },
      {
        dealId: createdDeals[7].id,
        name: createdDeals[7].name,
        value: 25000.0,
        stage: 'Qualified',
        expectedCloseDate: new Date('2026-06-20'), // Close date slipped
        snapshotDate,
      },
      {
        dealId: createdDeals[8].id,
        name: createdDeals[8].name,
        value: 25000.0,
        stage: 'Qualified',
        expectedCloseDate: new Date('2026-06-25'), // Close date slipped
        snapshotDate,
      },
    ],
  });

  console.log('Database extended seeding complete!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
