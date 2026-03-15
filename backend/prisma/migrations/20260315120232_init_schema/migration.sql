-- CreateEnum
CREATE TYPE "GlobalRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "ProjectRole" AS ENUM ('OWNER', 'EDITOR', 'VIEWER');

-- CreateEnum
CREATE TYPE "I18nPattern" AS ENUM ('SINGLE_FILE', 'FOLDER_PER_LOCALE', 'SUFFIX', 'PREFIX');

-- CreateEnum
CREATE TYPE "IssueType" AS ENUM ('MISSING_KEY', 'UNUSED_KEY', 'INTERPOLATION_MISMATCH');

-- CreateEnum
CREATE TYPE "Tier" AS ENUM ('FREE', 'PRO');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "GlobalRole" NOT NULL DEFAULT 'MEMBER',
    "tier" "Tier" NOT NULL DEFAULT 'FREE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "i18n_pattern" "I18nPattern" NOT NULL,
    "owner_id" TEXT NOT NULL,
    "reference_language_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "ProjectRole" NOT NULL DEFAULT 'VIEWER',

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "languages" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "languages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_groups" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "file_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_files" (
    "id" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,
    "file_group_id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "translation_files_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "translation_file_versions" (
    "id" TEXT NOT NULL,
    "translation_file_id" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "version_number" INTEGER NOT NULL,
    "created_by" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "comment" TEXT,

    CONSTRAINT "translation_file_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_reports" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "file_group_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analysis_reports_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "analysis_issues" (
    "id" TEXT NOT NULL,
    "report_id" TEXT NOT NULL,
    "type" "IssueType" NOT NULL,
    "key" TEXT NOT NULL,
    "language_id" TEXT NOT NULL,
    "reference_language_id" TEXT NOT NULL,
    "details" JSONB,

    CONSTRAINT "analysis_issues_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_project_id_user_id_key" ON "project_members"("project_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "languages_project_id_code_key" ON "languages"("project_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "file_groups_project_id_name_key" ON "file_groups"("project_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "translation_files_language_id_file_group_id_key" ON "translation_files"("language_id", "file_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "translation_file_versions_translation_file_id_version_numbe_key" ON "translation_file_versions"("translation_file_id", "version_number");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_reference_language_id_fkey" FOREIGN KEY ("reference_language_id") REFERENCES "languages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "languages" ADD CONSTRAINT "languages_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "file_groups" ADD CONSTRAINT "file_groups_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_files" ADD CONSTRAINT "translation_files_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_files" ADD CONSTRAINT "translation_files_file_group_id_fkey" FOREIGN KEY ("file_group_id") REFERENCES "file_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_file_versions" ADD CONSTRAINT "translation_file_versions_translation_file_id_fkey" FOREIGN KEY ("translation_file_id") REFERENCES "translation_files"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "translation_file_versions" ADD CONSTRAINT "translation_file_versions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_reports" ADD CONSTRAINT "analysis_reports_file_group_id_fkey" FOREIGN KEY ("file_group_id") REFERENCES "file_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_issues" ADD CONSTRAINT "analysis_issues_report_id_fkey" FOREIGN KEY ("report_id") REFERENCES "analysis_reports"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_issues" ADD CONSTRAINT "analysis_issues_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_issues" ADD CONSTRAINT "analysis_issues_reference_language_id_fkey" FOREIGN KEY ("reference_language_id") REFERENCES "languages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
