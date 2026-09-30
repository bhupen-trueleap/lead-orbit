INSERT INTO "columns" ("key", "label", "type", "instruction", "category", "scope", "is_preset") VALUES
  ('current_title', 'Title', 'text', 'The person''s current job title', 'people', 'entity', true),
  ('company', 'Company', 'text', 'The company or organization the person currently works at', 'people', 'entity', true),
  ('location', 'Location', 'text', 'The city and country where the person is based', 'people', 'entity', true),
  ('linkedin_followers', 'LinkedIn followers', 'number', 'The person''s LinkedIn follower count, as a plain number', 'people', 'entity', true),
  ('email', 'Email', 'text', 'A public email address for the person, only if written on the page', 'people', 'entity', true),
  ('phone', 'Phone', 'text', 'A public phone number for the person, only if written on the page', 'people', 'entity', true),
  ('industry', 'Industry', 'text', 'The company''s industry or sector', 'company', 'entity', true),
  ('headcount', 'Headcount', 'number', 'The company''s number of employees, as a plain number', 'company', 'entity', true),
  ('total_funding', 'Total funding (USD)', 'number', 'Total funding the company has raised, in US dollars, as a plain number', 'company', 'entity', true),
  ('headquarters', 'Headquarters', 'text', 'The city and country of the company''s headquarters', 'company', 'entity', true),
  ('website', 'Website', 'text', 'The company''s website URL', 'company', 'entity', true),
  ('summary', 'Summary', 'text', 'One sentence describing who or what this page is about', NULL, 'entity', true)
ON CONFLICT ("key") DO NOTHING;
