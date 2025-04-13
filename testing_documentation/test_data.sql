-- Additional test user with special characters to test security
INSERT INTO users (full_name, email, password_hash, phone, national_id, prs_id, role_id) VALUES
('Test O\'Connor', 'test.special+chars@example.com', SHA2('t3st<p@ss>', 256), '+1-555-123-4567', 'TEST01', 'PRS999', 3);

-- A vaccination record with future date (to test validation)
INSERT INTO vaccination_records (user_id, vaccine_name, date_administered, dose_number, provider, lot_number, expiration_date) VALUES
(1, 'Future Test Vaccine', '2025-12-31', 1, 'Test Clinic', 'TEST-12345', '2026-12-31');

-- A deleted user placeholder (for testing error cases)
INSERT INTO users (full_name, email, password_hash, phone, national_id, prs_id, role_id) VALUES
('To Be Deleted', 'delete.me@example.com', SHA2('deleteme', 256), '+9999999999', 'DELETE01', 'PRSDEL', 3);

-- After running your tests, you can delete this user with:
-- DELETE FROM users WHERE email = 'delete.me@example.com';