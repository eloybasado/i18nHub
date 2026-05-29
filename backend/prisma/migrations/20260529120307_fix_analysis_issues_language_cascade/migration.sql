-- DropForeignKey
ALTER TABLE "analysis_issues" DROP CONSTRAINT "analysis_issues_language_id_fkey";

-- DropForeignKey
ALTER TABLE "analysis_issues" DROP CONSTRAINT "analysis_issues_reference_language_id_fkey";

-- AddForeignKey
ALTER TABLE "analysis_issues" ADD CONSTRAINT "analysis_issues_language_id_fkey" FOREIGN KEY ("language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "analysis_issues" ADD CONSTRAINT "analysis_issues_reference_language_id_fkey" FOREIGN KEY ("reference_language_id") REFERENCES "languages"("id") ON DELETE CASCADE ON UPDATE CASCADE;
