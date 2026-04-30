-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('draft', 'imported', 'analyzing', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('pending', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('queued', 'running', 'completed', 'partial_failed', 'failed');

-- CreateEnum
CREATE TYPE "Sentiment" AS ENUM ('positive', 'neutral', 'negative');

-- CreateTable
CREATE TABLE "task" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "product_name" TEXT NOT NULL,
    "source_channel" TEXT NOT NULL,
    "status" "TaskStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_record" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "raw_content" TEXT NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "status" "ImportStatus" NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_record_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "import_id" TEXT NOT NULL,
    "cmt_id" TEXT NOT NULL,
    "shop_id" TEXT NOT NULL,
    "item_id" TEXT NOT NULL,
    "rating_star" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "comment_tr" TEXT,
    "model_name" TEXT,
    "has_media" BOOLEAN NOT NULL DEFAULT false,
    "comment_time" TIMESTAMP(3),
    "source_channel" TEXT NOT NULL,
    "raw_json" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_run" (
    "id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "prompt_version" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'queued',
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failed_count" INTEGER NOT NULL DEFAULT 0,
    "dashboard_snapshot" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "started_at" TIMESTAMP(3),
    "finished_at" TIMESTAMP(3),

    CONSTRAINT "analysis_run_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "review_analysis" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "review_id" TEXT NOT NULL,
    "sentiment" "Sentiment" NOT NULL,
    "sentiment_score" DOUBLE PRECISION NOT NULL,
    "topic_labels" TEXT[],
    "keywords" TEXT[],
    "summary" TEXT NOT NULL,
    "pain_points" TEXT[],
    "highlights" TEXT[],
    "suggestion" TEXT NOT NULL,
    "needs_attention" BOOLEAN NOT NULL DEFAULT false,
    "raw_model_output" TEXT NOT NULL,

    CONSTRAINT "review_analysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_stat" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "issue_name" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "sample_review_ids" TEXT[],

    CONSTRAINT "issue_stat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tag_stat" (
    "id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "tag_name" TEXT NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "tag_stat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "review_task_id_cmt_id_key" ON "review"("task_id", "cmt_id");

-- CreateIndex
CREATE UNIQUE INDEX "review_analysis_run_id_review_id_key" ON "review_analysis"("run_id", "review_id");

-- AddForeignKey
ALTER TABLE "import_record" ADD CONSTRAINT "import_record_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review" ADD CONSTRAINT "review_import_id_fkey" FOREIGN KEY ("import_id") REFERENCES "import_record"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_run" ADD CONSTRAINT "analysis_run_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_analysis" ADD CONSTRAINT "review_analysis_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "analysis_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_analysis" ADD CONSTRAINT "review_analysis_review_id_fkey" FOREIGN KEY ("review_id") REFERENCES "review"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_stat" ADD CONSTRAINT "issue_stat_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "analysis_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tag_stat" ADD CONSTRAINT "tag_stat_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "analysis_run"("id") ON DELETE CASCADE ON UPDATE CASCADE;

