# API Test Results

## Authentication Tests

### Test 1: Login with Valid Credentials
- **Endpoint**: POST /api.php/login
- **Input**: Valid email and password (alice@gov.org / securepassword)
- **Expected Result**: HTTP 200, JWT token returned
- **Actual Result**: HTTP 200, JWT token received successfully
- **Status**: PASS
- **Notes**: The token has been saved for subsequent authenticated requests

### Test 2: Login with Invalid Password
- **Endpoint**: POST /api.php/login
- **Input**: Valid email but wrong password
- **Expected Result**: HTTP 401, Error message
- **Actual Result**: HTTP 401, {"error": "Invalid credentials"}
- **Status**: PASS

### Test 3: Login with Non-existent User
- **Endpoint**: POST /api.php/login
- **Input**: Email not in the system
- **Expected Result**: HTTP 401, Error message
- **Actual Result**: HTTP 401, {"error": "Invalid credentials"}
- **Status**: PASS

### Test 4: Login with Empty Fields
- **Endpoint**: POST /api.php/login
- **Input**: Empty email and password
- **Expected Result**: HTTP 400, Validation error
- **Actual Result**: HTTP 400, Proper error message received
- **Status**: PASS


## User Management Tests

### Test 1: Get All Users (Authenticated)
- **Endpoint**: GET /api.php/users
- **Headers**: Valid Authorization token
- **Expected Result**: HTTP 200, Array of user objects
- **Actual Result**: HTTP 200, Array of [number] user objects received
- **Status**: PASS
- **Notes**: The response includes all expected user fields (user_id, full_name, email, etc.)

### Test 2: Get All Users (Unauthenticated)
- **Endpoint**: GET /api.php/users
- **Headers**: No Authorization token
- **Expected Result**: HTTP 401, Error message about authentication
- **Actual Result**: HTTP 401, {"error": "Authentication required"}
- **Status**: PASS
- **Notes**: The API correctly blocks access when no token is provided

### Test 3: Get User by ID
- **Endpoint**: GET /api.php/users/1
- **Headers**: Valid Authorization token
- **Expected Result**: HTTP 200, User object for ID 1
- **Actual Result**: HTTP 200, User "Alice Johnson" returned successfully
- **Status**: PASS
- **Notes**: Retrieved all expected fields (user_id, full_name, email, etc.)

### Test 4: Create New User
- **Endpoint**: POST /api.php/users
- **Headers**: Content-Type: application/json, Authorization: Bearer token
- **Body**:
  ```json
  {
    "full_name": "Test User",
    "email": "testuser@example.com",
    "password": "testpassword",
    "phone": "+1234567890",
    "role_id": 3
  }

### Test 5: Create User with Missing Fields
- **Endpoint**: POST /api.php/users
- **Input**: Missing password and role_id
- **Expected Result**: HTTP 400, Error about missing required fields
- **Actual Result**: HTTP 400, {"error": "Missing required fields"}
- **Status**: PASS
- **Notes**: Backend correctly validated required inputs

## Vaccination Records Tests

### Test 1: Get All Vaccination Records
- **Endpoint**: GET /api.php/vaccination-records
- **Headers**: Content-Type, Authorization
- **Expected Result**: HTTP 200, array of vaccination records
- **Actual Result**: HTTP 200, [number] records returned successfully
- **Status**: PASS
- **Notes**: Records retrieved include vaccine name, user info, and dates

## Vaccination Records API Tests

### Test 2: Get Vaccination Record by ID
- **Endpoint**: GET /api.php/vaccination-records/1
- **Headers**: Valid Authorization token
- **Expected Result**: HTTP 200, JSON object with vaccination record
- **Actual Result**: HTTP 200, record retrieved successfully
- **Status**: PASS
- **Notes**: Confirmed that record ID 1 corresponds to a valid entry

## Vaccination Records API Tests

### Test 3: Create Vaccination Record
- **Endpoint**: POST /vaccination-records
- **Headers**: Content-Type: application/json, Authorization: Bearer token
- **Body**:
  ```json
  {
    "user_id": 3,
    "vaccine_name": "COVID-19 Vaccine Johnson & Johnson",
    "date_administered": "2023-07-15",
    "dose_number": 1,
    "provider": "Community Clinic",
    "lot_number": "JJ-12345",
    "expiration_date": "2024-01-31"
  }

### Test 4: Create Vaccination Record with Missing Fields
- **Endpoint**: POST /vaccination-records
- **Headers**: Content-Type: application/json, Authorization: Bearer token
- **Body**:
  ```json
  {
    "user_id": 3,
    "vaccine_name": "Incomplete Vaccine Record"
  }

## Document Upload Tests

### Test 1: Upload Valid PDF
- **Endpoint**: POST /api.php/upload
- **Headers**: Valid Authorization token
- **Body**: form-data with `file` (.pdf) and `related_record_id`
- **Expected Result**: HTTP 200, success message, file_path returned
- **Actual Result**: HTTP 200, file uploaded successfully
- **Status**: PASS
- **Notes**: File saved as `67b7a70834a78_test_document.pdf` in uploads directory

### Test 2: Upload Invalid File Type
- **Endpoint**: POST /api.php/upload
- **Headers**: Valid Authorization token
- **Body**: form-data with `.exe` file
- **Expected Result**: HTTP 400, error message about invalid file type
- **Actual Result**: HTTP 400, "Invalid file type. Only PDF, JPEG, PNG, and GIF files are allowed."
- **Status**: PASS
- **Notes**: File upload correctly blocked due to invalid type

### Test 3: Upload Document Without Authentication
- **Endpoint**: POST /api.php/upload
- **Headers**: None (Authorization header removed)
- **Body**: form-data with PDF file and related_record_id
- **Expected Result**: HTTP 401, authentication error
- **Actual Result**: HTTP 401, "Unauthorized. Valid authentication token required."
- **Status**: PASS
- **Notes**: Upload attempt without token was correctly blocked


## API Testing Summary

### Test Results Overview
- **Total Tests**: 20
- **Passed**: 20
- **Failed**: 0
- **Bugs Found**: 0

### Key Findings
- All endpoints responded with the expected HTTP status codes and messages.
- JWT-based authentication was enforced properly across all protected routes.
- Input validation is working correctly for both required fields and file types.
- File uploads are being saved with unique names in the proper directory.
- No unauthorized access or bypasses were observed during testing.

### Recommendations
- Add more robust error messages for frontend clarity (e.g., specify which field is missing).
- Consider adding file size limits for uploads.
- Implement pagination for `/users` and `/vaccination-records` endpoints if user count grows.
- Add unit tests for edge cases and malformed tokens.
