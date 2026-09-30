DROP INDEX "entities_search_vector_index";--> statement-breakpoint
DROP INDEX "web_pages_search_vector_index";--> statement-breakpoint
ALTER TABLE "entities" DROP COLUMN "search_vector";--> statement-breakpoint
ALTER TABLE "search_results" DROP COLUMN "source";--> statement-breakpoint
ALTER TABLE "web_pages" DROP COLUMN "search_vector";