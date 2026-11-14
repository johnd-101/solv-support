-- CreateEnum
CREATE TYPE "LogStatus" AS ENUM ('Open', 'In Progress', 'Closed');

-- CreateEnum
CREATE TYPE "AppointmentType" AS ENUM ('Meeting', 'Call', 'Visit', 'Personal', 'Other');

-- CreateTable
CREATE TABLE "practices" (
    "PRACTICE_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "practice_name" TEXT NOT NULL,
    "prac_number" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "mobile" TEXT,
    "email" TEXT,
    "address" TEXT,
    "product" TEXT DEFAULT 'Optom Suite',
    "notes" TEXT,

    CONSTRAINT "practices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "practice_id" UUID,
    "practice_name" TEXT,
    "contact_person" TEXT,
    "phone" TEXT,
    "product" TEXT DEFAULT 'Optom Suite',
    "issue" TEXT,
    "solution" TEXT,
    "notes" TEXT,
    "status" "LogStatus" NOT NULL DEFAULT 'Open',

    CONSTRAINT "logs_pkey" PRIMARY KEY ("id")
);



-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "start_time" TEXT NOT NULL DEFAULT '09:00',
    "end_time" TEXT NOT NULL DEFAULT '10:00',
    "type" "AppointmentType" NOT NULL DEFAULT 'Meeting',
    "location" TEXT,
    "practice_name" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "logs_practice_id_idx" ON "logs"("practice_id");

-- CreateIndex
CREATE INDEX "logs_status_idx" ON "logs"("status");

-- CreateIndex
CREATE INDEX "appointments_date_idx" ON "appointments"("date");

-- AddForeignKey
ALTER TABLE "logs" ADD CONSTRAINT "logs_practice_id_fkey" FOREIGN KEY ("practice_id") REFERENCES "practices"("id") ON DELETE SET NULL ON UPDATE CASCADE;
