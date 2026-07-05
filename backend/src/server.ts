import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', async (req, res) => {
  try {
    // Basic DB check
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: 'OK', database: 'CONNECTED' });
  } catch (error) {
    res.status(500).json({ status: 'ERROR', database: 'DISCONNECTED', error: String(error) });
  }
});

// Contacts CRUD
app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await prisma.contact.findMany({
      include: { deals: true, tasks: true, activityLogs: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, email, phone, company, status } = req.body;
    const contact = await prisma.contact.create({
      data: { name, email, phone, company, status: status || 'Lead' },
    });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create contact' });
  }
});

app.put('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, company, status } = req.body;
    const contact = await prisma.contact.update({
      where: { id },
      data: { name, email, phone, company, status },
    });
    res.json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update contact' });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.contact.delete({ where: { id } });
    res.json({ message: 'Contact deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

// Deals CRUD
app.get('/api/deals', async (req, res) => {
  try {
    const deals = await prisma.deal.findMany({
      include: { contact: true },
      orderBy: { createdAt: 'desc' },
    });
    res.json(deals);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

app.post('/api/deals', async (req, res) => {
  try {
    const { name, value, stage, priority, contactId, expectedCloseDate } = req.body;
    const deal = await prisma.deal.create({
      data: {
        name,
        value: parseFloat(value),
        stage: stage || 'Lead',
        priority: priority || 'Medium',
        contactId,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : null,
      },
    });
    res.status(201).json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create deal' });
  }
});

app.put('/api/deals/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, value, stage, priority, expectedCloseDate } = req.body;
    const deal = await prisma.deal.update({
      where: { id },
      data: {
        name,
        value: value !== undefined ? parseFloat(value) : undefined,
        stage,
        priority,
        expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      },
    });
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update deal' });
  }
});

// Activity Logging
app.post('/api/activities', async (req, res) => {
  try {
    const { type, content, contactId } = req.body;
    const activity = await prisma.activityLog.create({
      data: { type, content, contactId },
    });
    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log activity' });
  }
});

// Tasks CRUD
app.get('/api/tasks', async (req, res) => {
  try {
    const tasks = await prisma.task.findMany({
      include: { contact: true },
      orderBy: { dueDate: 'asc' },
    });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    const { title, description, status, priority, dueDate, contactId } = req.body;
    const task = await prisma.task.create({
      data: {
        title,
        description,
        status: status || 'Pending',
        priority: priority || 'Medium',
        dueDate: dueDate ? new Date(dueDate) : null,
        contactId,
      },
    });
    res.status(201).json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create task' });
  }
});

app.put('/api/tasks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, dueDate } = req.body;
    const task = await prisma.task.update({
      where: { id },
      data: {
        title,
        description,
        status,
        priority,
        dueDate: dueDate ? new Date(dueDate) : undefined,
      },
    });
    res.json(task);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update task' });
  }
});

// Forecast Pulse Calculations
app.get('/api/forecast/pulse-kpis', async (req, res) => {
  try {
    const stageWeights = await prisma.stageWeight.findMany();
    const weightsMap = stageWeights.reduce((acc, sw) => {
      acc[sw.stage] = sw.probability;
      return acc;
    }, {} as Record<string, number>);

    const openDeals = await prisma.deal.findMany({
      where: { NOT: { stage: { in: ['Closed Won', 'Closed Lost'] } } },
      include: { contact: { include: { activityLogs: true } } }
    });

    const bestCaseRaw = openDeals.reduce((sum, d) => sum + d.value, 0);

    const closedWonDeals = await prisma.deal.findMany({
      where: { stage: 'Closed Won' }
    });
    const closedWonRaw = closedWonDeals.reduce((sum, d) => sum + d.value, 0);

    let commitRaw = closedWonRaw;
    for (const d of openDeals) {
      let prob = weightsMap[d.stage] || 0;
      if (d.manualProbability !== null) {
        prob = d.manualProbability / 100;
      } else {
        const recentActivities = d.contact?.activityLogs.filter(a => {
          const limit = new Date();
          limit.setDate(limit.getDate() - 14);
          return new Date(a.createdAt) >= limit;
        }) || [];
        if (recentActivities.length >= 3) prob += 0.05;

        const lastMeeting = d.contact?.activityLogs.some(a => a.type === 'Meeting');
        const hasNoMeeting = !lastMeeting && ['Discovery', 'Proposal', 'Negotiation'].includes(d.stage);
        const hasRisk = hasNoMeeting && !d.overrideRiskFlag;
        if (hasRisk) prob -= 0.10;
        
        prob = Math.max(0, Math.min(1, prob));
      }
      commitRaw += d.value * prob;
    }

    const likelySlipDeals = openDeals.filter(d => d.pushedCount > 1);
    const likelySlipRaw = likelySlipDeals.reduce((sum, d) => sum + d.value, 0);

    const formatK = (val: number) => `$${Math.round(val / 1000)}K`;

    res.json({
      bestCase: formatK(bestCaseRaw),
      commit: formatK(commitRaw),
      likelySlip: formatK(likelySlipRaw),
      bestCaseRaw,
      commitRaw,
      likelySlipRaw,
      activeOpportunitiesCount: openDeals.length,
      executiveActionCount: likelySlipDeals.length
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pulse KPIs', details: String(error) });
  }
});

app.get('/api/forecast/pulse-stages', async (req, res) => {
  try {
    const stageWeights = await prisma.stageWeight.findMany();
    res.json(stageWeights.map(sw => ({
      name: sw.stage,
      confidence: Math.round(sw.probability * 100)
    })));
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pulse stages', details: String(error) });
  }
});

app.get('/api/forecast/pulse-pipeline', async (req, res) => {
  try {
    const stageWeights = await prisma.stageWeight.findMany();
    const weightsMap = stageWeights.reduce((acc, sw) => {
      acc[sw.stage] = sw.probability;
      return acc;
    }, {} as Record<string, number>);

    const openDeals = await prisma.deal.findMany({
      where: { NOT: { stage: { in: ['Closed Won', 'Closed Lost'] } } },
      include: { contact: { include: { activityLogs: true } } },
      orderBy: { value: 'desc' }
    });

    const snapshots = await prisma.dealSnapshot.findMany();
    const snapMap = snapshots.reduce((acc, s) => {
      if (!acc[s.dealId] || new Date(s.snapshotDate) > new Date(acc[s.dealId].snapshotDate)) {
        acc[s.dealId] = s;
      }
      return acc;
    }, {} as Record<string, typeof snapshots[0]>);

    const stagesOrder = ['Qualified', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won'];

    const result = openDeals.map(d => {
      let prob = weightsMap[d.stage] || 0;
      if (d.manualProbability !== null) {
        prob = d.manualProbability / 100;
      } else {
        const recentActivities = d.contact?.activityLogs.filter(a => {
          const limit = new Date();
          limit.setDate(limit.getDate() - 14);
          return new Date(a.createdAt) >= limit;
        }) || [];
        
        if (recentActivities.length >= 3) prob += 0.05;

        const lastMeeting = d.contact?.activityLogs.some(a => a.type === 'Meeting');
        const hasNoMeeting = !lastMeeting && ['Discovery', 'Proposal', 'Negotiation'].includes(d.stage);
        
        const hasRisk = hasNoMeeting && !d.overrideRiskFlag;
        if (hasRisk) prob -= 0.10;
        prob = Math.max(0, Math.min(1, prob));
      }

      const riskFlags: string[] = [];
      if (!d.overrideRiskFlag) {
        if (d.customRiskText) {
          riskFlags.push(d.customRiskText);
        } else {
          const hasMeeting = d.contact?.activityLogs.some(a => a.type === 'Meeting');
          if (!hasMeeting && ['Discovery', 'Proposal', 'Negotiation'].includes(d.stage)) {
            riskFlags.push('No technical meeting booked');
          }
          const lastActivity = d.contact?.activityLogs[0];
          if (lastActivity) {
            const daysAgo = (new Date().getTime() - new Date(lastActivity.createdAt).getTime()) / (1000 * 3600 * 24);
            if (daysAgo > 7) {
              riskFlags.push('Stale opportunity');
            }
          }
        }
      }

      const snap = snapMap[d.id];
      let valueArrow = 'stable';
      let timelineArrow = 'stable';

      if (snap) {
        if (d.value > snap.value) valueArrow = 'up';
        else if (d.value < snap.value) valueArrow = 'down';

        const currentStageIdx = stagesOrder.indexOf(d.stage);
        const snapStageIdx = stagesOrder.indexOf(snap.stage);
        
        const stageProgressed = currentStageIdx > snapStageIdx;
        const stageRegressed = currentStageIdx < snapStageIdx;

        const dateSlipped = snap.expectedCloseDate && d.expectedCloseDate && new Date(d.expectedCloseDate) > new Date(snap.expectedCloseDate);
        const datePulledIn = snap.expectedCloseDate && d.expectedCloseDate && new Date(d.expectedCloseDate) < new Date(snap.expectedCloseDate);

        if (stageProgressed || datePulledIn) timelineArrow = 'up';
        else if (stageRegressed || dateSlipped) timelineArrow = 'down';
      }

      const activityCount = d.contact?.activityLogs.filter(a => {
        const limit = new Date();
        limit.setDate(limit.getDate() - 14);
        return new Date(a.createdAt) >= limit;
      }).length || 0;

      return {
        id: d.id,
        account: d.contact?.company || 'Unknown',
        dealName: d.name,
        dealSize: `$${Math.round(d.value / 1000)}K`,
        value: d.value,
        stageProbability: `${Math.round(prob * 100)}%`,
        stageProbabilityRaw: Math.round(prob * 100),
        step: d.stage,
        lastAction: d.nextAction || 'No action defined',
        riskFlags,
        valueArrow,
        timelineArrow,
        activityVelocity: `${activityCount} touches`,
        activityCount,
        overrideRiskFlag: d.overrideRiskFlag,
        customRiskText: d.customRiskText,
        manualProbability: d.manualProbability,
        expectedCloseDate: d.expectedCloseDate,
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch pulse pipeline', details: String(error) });
  }
});

app.put('/api/deals/:id/override', async (req, res) => {
  try {
    const { id } = req.params;
    const { manualProbability, overrideRiskFlag, customRiskText, nextAction, value, stage } = req.body;

    const data: any = {};
    if (manualProbability !== undefined) {
      data.manualProbability = manualProbability === null ? null : parseInt(manualProbability);
    }
    if (overrideRiskFlag !== undefined) {
      data.overrideRiskFlag = !!overrideRiskFlag;
    }
    if (customRiskText !== undefined) {
      data.customRiskText = customRiskText === '' ? null : customRiskText;
    }
    if (nextAction !== undefined) {
      data.nextAction = nextAction;
    }
    if (value !== undefined) {
      data.value = parseFloat(value);
    }
    if (stage !== undefined) {
      data.stage = stage;
    }

    const updatedDeal = await prisma.deal.update({
      where: { id },
      data,
    });

    res.json(updatedDeal);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save deal override', details: String(error) });
  }
});

// Team Activity Outbound KPI Endpoints
app.get('/api/team-activity/kpis', async (req, res) => {
  try {
    const { timeframe } = req.query;
    let kpis = {
      emails: { label: "Total Emails Sent", value: "1,240", trend: "+12.4%", outcome: "14.2% reply rate" },
      calls: { label: "Total Calls Made", value: "410", trend: "+8.2%", outcome: "8.5% connect rate" },
      meetings: { label: "Meetings Booked", value: "18", trend: "+18.5%", outcome: "94% show rate" },
      proposals: { label: "Proposals Sent", value: "5", trend: "+5.3%", outcome: "60% win rate" },
    };

    if (timeframe === "last-week") {
      kpis = {
        emails: { label: "Total Emails Sent", value: "1,150", trend: "+9.1%", outcome: "13.8% reply rate" },
        calls: { label: "Total Calls Made", value: "385", trend: "+6.4%", outcome: "7.9% connect rate" },
        meetings: { label: "Meetings Booked", value: "15", trend: "+10.0%", outcome: "90% show rate" },
        proposals: { label: "Proposals Sent", value: "4", trend: "+2.5%", outcome: "50% win rate" },
      };
    } else if (timeframe === "month-to-date") {
      kpis = {
        emails: { label: "Total Emails Sent", value: "4,820", trend: "+14.8%", outcome: "14.5% reply rate" },
        calls: { label: "Total Calls Made", value: "1,580", trend: "+9.7%", outcome: "8.9% connect rate" },
        meetings: { label: "Meetings Booked", value: "72", trend: "+22.4%", outcome: "93% show rate" },
        proposals: { label: "Proposals Sent", value: "21", trend: "+8.1%", outcome: "58% win rate" },
      };
    }
    res.json(kpis);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team activity KPIs', details: String(error) });
  }
});

app.get('/api/team-activity/daily-chart', async (req, res) => {
  try {
    const { timeframe } = req.query;
    let data = [
      { name: "Mon", emails: 28, calls: 18 },
      { name: "Tue", emails: 85, calls: 42 },
      { name: "Wed", emails: 30, calls: 12 },
      { name: "Thu", emails: 72, calls: 48 },
      { name: "Fri", emails: 55, calls: 38 },
      { name: "Sat", emails: 60, calls: 86 },
      { name: "Sun", emails: 85, calls: 50 },
    ];

    if (timeframe === "last-week") {
      data = [
        { name: "Mon", emails: 40, calls: 22 },
        { name: "Tue", emails: 65, calls: 30 },
        { name: "Wed", emails: 35, calls: 15 },
        { name: "Thu", emails: 88, calls: 52 },
        { name: "Fri", emails: 62, calls: 40 },
        { name: "Sat", emails: 45, calls: 70 },
        { name: "Sun", emails: 50, calls: 36 },
      ];
    } else if (timeframe === "month-to-date") {
      data = [
        { name: "Wk 1", emails: 850, calls: 290 },
        { name: "Wk 2", emails: 1240, calls: 410 },
        { name: "Wk 3", emails: 1450, calls: 520 },
        { name: "Wk 4", emails: 1280, calls: 360 },
      ];
    }
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch team daily chart', details: String(error) });
  }
});

app.get('/api/team-activity/leaderboard', async (req, res) => {
  try {
    const { timeframe } = req.query;
    let reps = [
      { name: "Avery Jones", initials: "AJ", emails: 1240, calls: 410, meetings: 18 },
      { name: "Elehia Milen", initials: "EM", emails: 150, calls: 20, meetings: 10 },
      { name: "Marhan Harner", initials: "MH", emails: 56, calls: 16, meetings: 3 },
      { name: "Avery Person", initials: "AP", emails: 18, calls: 7, meetings: 0 },
    ];

    if (timeframe === "last-week") {
      reps = [
        { name: "Avery Jones", initials: "AJ", emails: 1150, calls: 385, meetings: 15 },
        { name: "Elehia Milen", initials: "EM", emails: 140, calls: 18, meetings: 8 },
        { name: "Marhan Harner", initials: "MH", emails: 48, calls: 14, meetings: 2 },
        { name: "Avery Person", initials: "AP", emails: 22, calls: 9, meetings: 1 },
      ];
    } else if (timeframe === "month-to-date") {
      reps = [
        { name: "Avery Jones", initials: "AJ", emails: 4820, calls: 1580, meetings: 72 },
        { name: "Elehia Milen", initials: "EM", emails: 580, calls: 82, meetings: 38 },
        { name: "Marhan Harner", initials: "MH", emails: 244, calls: 68, meetings: 12 },
        { name: "Avery Person", initials: "AP", emails: 95, calls: 32, meetings: 3 },
      ];
    }
    res.json(reps);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rep leaderboard', details: String(error) });
  }
});

app.get('/api/team-activity/dormant-accounts', async (req, res) => {
  try {
    const openDeals = await prisma.deal.findMany({
      where: { NOT: { stage: { in: ['Closed Won', 'Closed Lost'] } } },
      include: { contact: { include: { activityLogs: { orderBy: { createdAt: 'desc' } } } } }
    });

    const result = openDeals.map(d => {
      const lastActivity = d.contact?.activityLogs[0];
      let days = 0;
      let lastActivityDateStr = 'No activity';
      if (lastActivity) {
        const diffTime = Math.abs(new Date().getTime() - new Date(lastActivity.createdAt).getTime());
        days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        lastActivityDateStr = new Date(lastActivity.createdAt).toISOString().split('T')[0];
      } else {
        const diffTime = Math.abs(new Date().getTime() - new Date(d.createdAt).getTime());
        days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        lastActivityDateStr = new Date(d.createdAt).toISOString().split('T')[0];
      }

      return {
        id: d.id,
        name: d.name,
        value: `$${Math.round(d.value / 1000)}K`,
        valueNumeric: d.value,
        lastActivity: lastActivityDateStr,
        days: days || 1
      };
    });

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch dormant accounts', details: String(error) });
  }
});

// Leads Workspace API Endpoints

app.get('/api/leads', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({
      include: {
        account: true,
        contacts: true,
        activities: {
          orderBy: { activityDate: 'desc' }
        },
        stageHistory: {
          orderBy: { changedAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch leads', details: String(error) });
  }
});

app.get('/api/leads/regions', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      select: { salesRegion: true },
      distinct: ['salesRegion'],
    });
    const regions = accounts.map(a => a.salesRegion).filter(Boolean);
    res.json(regions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch sales regions', details: String(error) });
  }
});

app.get('/api/leads/accounts', async (req, res) => {
  try {
    const accounts = await prisma.account.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(accounts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch accounts', details: String(error) });
  }
});

app.post('/api/leads', async (req, res) => {
  try {
    const { opportunityName, accountName, accountId, salesRegion, forecastCloseDate, painPoints, dealValue } = req.body;
    
    let finalAccountId = accountId;
    if (!finalAccountId && accountName) {
      let existingAccount = await prisma.account.findFirst({
        where: { name: { equals: accountName, mode: 'insensitive' } }
      });
      if (!existingAccount) {
        existingAccount = await prisma.account.create({
          data: {
            name: accountName,
            salesRegion: salesRegion || 'US East',
          }
        });
      }
      finalAccountId = existingAccount.id;
    }

    const newLead = await prisma.lead.create({
      data: {
        opportunityName,
        accountId: finalAccountId || null,
        stage: 'contact',
        openDate: new Date(),
        forecastCloseDate: forecastCloseDate ? new Date(forecastCloseDate) : null,
        painPoints,
        dealValue: dealValue !== undefined && dealValue !== null ? Number(dealValue) : 0,
      },
      include: {
        account: true,
        contacts: true,
        activities: true,
        stageHistory: true,
      }
    });

    await prisma.leadStageHistory.create({
      data: {
        leadId: newLead.id,
        fromStage: null,
        toStage: 'contact',
      }
    });

    res.status(201).json(newLead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create lead', details: String(error) });
  }
});

app.post('/api/leads/:id/contacts', async (req, res) => {
  try {
    const { id } = req.params;
    const { firstName, lastName, email, phone, stakeholderRole } = req.body;
    
    const lead = await prisma.lead.findUnique({
      where: { id }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const contact = await prisma.leadContact.create({
      data: {
        leadId: lead.id,
        accountId: lead.accountId,
        firstName,
        lastName,
        email,
        phone,
        stakeholderRole,
      }
    });
    res.status(201).json(contact);
  } catch (error) {
    res.status(500).json({ error: 'Failed to add contact', details: String(error) });
  }
});

app.post('/api/leads/:id/activities', async (req, res) => {
  try {
    const { id } = req.params;
    const { activityType, activityDate, note } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const activity = await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        activityType,
        activityDate: activityDate ? new Date(activityDate) : new Date(),
        note,
      }
    });

    res.status(201).json(activity);
  } catch (error) {
    res.status(500).json({ error: 'Failed to log activity', details: String(error) });
  }
});

app.post('/api/leads/:id/disqualify', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        stage: 'disqualified',
        disqualificationReason: reason,
      }
    });

    await prisma.leadStageHistory.create({
      data: {
        leadId: lead.id,
        fromStage: lead.stage,
        toStage: 'disqualified',
      }
    });

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to disqualify lead', details: String(error) });
  }
});

app.put('/api/leads/:id/stage', async (req, res) => {
  try {
    const { id } = req.params;
    const { toStage, postDemoOutcome } = req.body;

    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        activities: true,
        contacts: true,
      }
    });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const fromStage = lead.stage;

    if (toStage !== 'disqualified') {
      if (fromStage === 'contact' && toStage === 'outreach') {
        const hasEmail = lead.activities.some(a => a.activityType === 'email');
        if (!hasEmail) return res.status(400).json({ error: 'At least one activity of type "email" is required to move to Outreach.' });
      }
      if (fromStage === 'outreach' && toStage === 'connected') {
        const hasCallOrMeeting = lead.activities.some(a => ['call', 'meeting'].includes(a.activityType));
        if (!hasCallOrMeeting) return res.status(400).json({ error: 'At least one activity of type "call" or "meeting" is required to move to Connected.' });
      }
      if (fromStage === 'connected' && toStage === 'presentation') {
        if (lead.contacts.length === 0) return res.status(400).json({ error: 'At least one contact is required to move to Presentation.' });
      }
      if (fromStage === 'presentation' && toStage === 'demo') {
        const hasPresentation = lead.activities.some(a => a.activityType === 'presentation');
        if (!hasPresentation) return res.status(400).json({ error: 'At least one activity of type "presentation" is required to move to Demo.' });
      }
      if (fromStage === 'demo' && toStage === 'evaluating') {
        const hasDemo = lead.activities.some(a => a.activityType === 'demo');
        if (!hasDemo) return res.status(400).json({ error: 'At least one activity of type "demo" is required to move to Evaluating.' });
        if (!lead.forecastCloseDate) return res.status(400).json({ error: 'Forecast Close Date must be set to move to Evaluating.' });
        const hasBuyerOrDecisionMaker = lead.contacts.some(c => ['economic_buyer', 'decision_maker'].includes(c.stakeholderRole || ''));
        if (!hasBuyerOrDecisionMaker) return res.status(400).json({ error: 'At least one contact with role "Economic Buyer" or "Decision Maker" is required to move to Evaluating.' });
      }
      if (fromStage === 'evaluating' && toStage === 'deal') {
        if (!postDemoOutcome) return res.status(400).json({ error: 'A post demo outcome must be selected to close this lead.' });
        if (['not_now', 'not_a_fit'].includes(postDemoOutcome)) {
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              stage: 'disqualified',
              postDemoOutcome,
              disqualificationReason: postDemoOutcome === 'not_now' ? 'no_timing' : 'no_need',
            }
          });
          await prisma.leadStageHistory.create({
            data: {
              leadId: lead.id,
              fromStage,
              toStage: 'disqualified',
            }
          });
          return res.json({ message: 'Lead disqualified as part of evaluating outcome.', stage: 'disqualified' });
        }
      }
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        stage: toStage,
        postDemoOutcome: toStage === 'deal' || toStage === 'evaluating' ? postDemoOutcome : lead.postDemoOutcome,
      }
    });

    await prisma.leadStageHistory.create({
      data: {
        leadId: lead.id,
        fromStage,
        toStage,
      }
    });

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to transition stage', details: String(error) });
  }
});

app.put('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      opportunityName,
      forecastCloseDate,
      competitor,
      painPoints,
      salesRegion,
      industry,
      companySize,
      dealValue,
    } = req.body;

    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        opportunityName: opportunityName !== undefined ? opportunityName : lead.opportunityName,
        forecastCloseDate: forecastCloseDate !== undefined ? (forecastCloseDate ? new Date(forecastCloseDate) : null) : lead.forecastCloseDate,
        competitor: competitor !== undefined ? competitor : lead.competitor,
        painPoints: painPoints !== undefined ? painPoints : lead.painPoints,
        dealValue: dealValue !== undefined ? (dealValue !== null ? Number(dealValue) : 0) : undefined,
      }
    });

    if (lead.accountId && (salesRegion !== undefined || industry !== undefined || companySize !== undefined)) {
      await prisma.account.update({
        where: { id: lead.accountId },
        data: {
          salesRegion: salesRegion !== undefined ? salesRegion : undefined,
          industry: industry !== undefined ? industry : undefined,
          companySize: companySize !== undefined ? companySize : undefined,
        }
      });
    }

    res.json(updatedLead);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update lead details', details: String(error) });
  }
});

app.delete('/api/leads/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Delete all rows in lead_activities where lead_id matches
    await prisma.leadActivity.deleteMany({
      where: { leadId: id }
    });

    // 2. Delete all rows in lead_stage_history where lead_id matches
    await prisma.leadStageHistory.deleteMany({
      where: { leadId: id }
    });

    // 3. Delete all rows in contacts (LeadContact) where lead_id matches
    await prisma.leadContact.deleteMany({
      where: { leadId: id }
    });

    // 4. Delete the lead row itself from the leads table
    await prisma.lead.delete({
      where: { id }
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete lead', details: String(error) });
  }
});

// Accounts Write Endpoints
app.post('/api/accounts', async (req, res) => {
  try {
    const { name, industry, company_size, sales_region, notes } = req.body;
    const account = await prisma.account.create({
      data: {
        name,
        industry: industry || null,
        companySize: company_size || null,
        salesRegion: sales_region || 'US East',
        notes: notes || null
      }
    });
    res.status(201).json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account', details: String(error) });
  }
});

app.put('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, industry, company_size, sales_region, notes } = req.body;
    const account = await prisma.account.update({
      where: { id },
      data: {
        name,
        industry: industry || null,
        companySize: company_size || null,
        salesRegion: sales_region || 'US East',
        notes: notes || null
      }
    });
    res.json(account);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account', details: String(error) });
  }
});

app.delete('/api/accounts/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Cascade delete via Prisma
    const leads = await prisma.lead.findMany({ where: { accountId: id } });
    const leadIds = leads.map(l => l.id);

    if (leadIds.length > 0) {
      await prisma.leadActivity.deleteMany({ where: { leadId: { in: leadIds } } });
      await prisma.leadStageHistory.deleteMany({ where: { leadId: { in: leadIds } } });
    }

    await prisma.leadContact.deleteMany({ where: { accountId: id } });
    await prisma.lead.deleteMany({ where: { accountId: id } });
    await prisma.account.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete account', details: String(error) });
  }
});

// Start Server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
