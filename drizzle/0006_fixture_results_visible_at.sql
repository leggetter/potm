-- Allow admins to show results deliberately after closing voting early
ALTER TABLE `fixtures` ADD COLUMN `results_visible_at` integer;
