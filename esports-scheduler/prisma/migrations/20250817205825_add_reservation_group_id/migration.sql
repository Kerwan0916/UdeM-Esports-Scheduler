-- AlterTable
ALTER TABLE "public"."Reservation" ADD COLUMN     "groupId" TEXT;

-- CreateIndex
CREATE INDEX "Reservation_groupId_idx" ON "public"."Reservation"("groupId");
