-- CreateTable
CREATE TABLE "public"."PresenceLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "checkIn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkOut" TIMESTAMP(3),

    CONSTRAINT "PresenceLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PresenceLog_userId_checkIn_idx" ON "public"."PresenceLog"("userId", "checkIn");

-- AddForeignKey
ALTER TABLE "public"."PresenceLog" ADD CONSTRAINT "PresenceLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
