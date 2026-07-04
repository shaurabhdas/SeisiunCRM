import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  console.log("Setting up Supabase DB trigger for lead_activities...")
  
  const createFunctionSql = `
    CREATE OR REPLACE FUNCTION update_lead_last_connect_date()
    RETURNS TRIGGER AS $$
    BEGIN
      UPDATE leads
      SET last_connect_date = NEW.activity_date
      WHERE id = NEW.lead_id;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  const dropTriggerSql = `
    DROP TRIGGER IF EXISTS trg_update_lead_last_connect_date ON lead_activities;
  `;

  const createTriggerSql = `
    CREATE TRIGGER trg_update_lead_last_connect_date
    AFTER INSERT ON lead_activities
    FOR EACH ROW
    EXECUTE FUNCTION update_lead_last_connect_date();
  `;

  console.log("Deploying function...");
  await prisma.$executeRawUnsafe(createFunctionSql);
  
  console.log("Dropping existing trigger if exists...");
  await prisma.$executeRawUnsafe(dropTriggerSql);
  
  console.log("Creating new trigger...");
  await prisma.$executeRawUnsafe(createTriggerSql);
  
  console.log("Trigger created successfully in Supabase!");
}

main()
  .catch((e) => {
    console.error("Error setting up trigger:", e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
