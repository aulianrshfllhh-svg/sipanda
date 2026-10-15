ALTER TABLE document_sections
  ADD COLUMN updated_by_id VARCHAR(191) NULL,
  ADD INDEX document_sections_updated_by_id_idx (updated_by_id),
  ADD CONSTRAINT document_sections_updated_by_id_fkey
    FOREIGN KEY (updated_by_id) REFERENCES users(id)
    ON DELETE SET NULL ON UPDATE CASCADE;
