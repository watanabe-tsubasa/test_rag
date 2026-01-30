ALTER TABLE "documents" ALTER COLUMN "embedding" SET DATA TYPE vector(1536);--> statement-breakpoint
ALTER TABLE "documents" ALTER COLUMN "embedding" SET NOT NULL;