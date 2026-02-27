-- Add sales_sections column to courses for pagebuilder-based sales pages
ALTER TABLE courses ADD COLUMN IF NOT EXISTS sales_sections JSONB DEFAULT '[]';

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
