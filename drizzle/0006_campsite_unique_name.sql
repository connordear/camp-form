-- Sites that already share a name (ignoring case and surrounding spaces) would
-- make the unique index fail. The oldest keeps its name; the others get a
-- " (2)", " (3)" suffix for an admin to rename.
UPDATE "campsites" AS c
SET "name" = trim(c."name") || ' (' || d.rn || ')'
FROM (
	SELECT "id", row_number() OVER (
		PARTITION BY lower(trim("name")) ORDER BY "createdAt", "id"
	) AS rn
	FROM "campsites"
) AS d
WHERE c."id" = d."id" AND d.rn > 1;--> statement-breakpoint
CREATE UNIQUE INDEX "campsites_name_unique" ON "campsites" USING btree (lower(trim("name")));
