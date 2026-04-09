-- AlterTable: add recurring task fields to Todo
ALTER TABLE "Todo" ADD COLUMN "recurrence" JSONB;
ALTER TABLE "Todo" ADD COLUMN "recurringParentId" TEXT;

-- AddForeignKey
ALTER TABLE "Todo" ADD CONSTRAINT "Todo_recurringParentId_fkey" FOREIGN KEY ("recurringParentId") REFERENCES "Todo"("id") ON DELETE SET NULL ON UPDATE CASCADE;
