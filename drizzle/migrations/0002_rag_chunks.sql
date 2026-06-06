CREATE TABLE `rag_chunks` (
	`id` text PRIMARY KEY NOT NULL,
	`source` text NOT NULL,
	`content` text NOT NULL,
	`embedding` text NOT NULL,
	`updated_at` integer NOT NULL
);
