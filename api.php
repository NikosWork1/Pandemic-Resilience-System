<?php
ini_set('display_errors', 1);
ini_set('display_startup_errors', 1);
error_reporting(E_ALL);
// Include required files
require 'db.php';
require 'jwt_handler.php';

// Error handling settings
ini_set('display_errors', 0);
ini_set('log_errors', 1);
error_reporting(E_ALL);

// Set content type to JSON
header('Content-Type: application/json');

// Enable CORS for development
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Get request method and path
$method = $_SERVER['REQUEST_METHOD'];
$request_uri = $_SERVER['REQUEST_URI'];
$base_path = '/prs/api.php';

// Extract path info (remove base path)
// Modify path extraction logic
if (isset($_SERVER['PATH_INFO'])) {
    $path_info = $_SERVER['PATH_INFO'];
} else {
    // Remove any leading 'api/' from the request URI
    $path_info = preg_replace('/^\/api\//', '', 
        str_replace($base_path, '', $request_uri)
    );
}
$request = explode('/', trim($path_info, '/'));

// Get request endpoint (first part of the path)
$endpoint = $request[0] ?? '';

// Function to log actions to audit_logs table
function log_action($user_id, $action, $entity_affected, $record_id = null) {
    global $conn;
    
    $stmt = $conn->prepare("INSERT INTO audit_logs (user_id, action, entity_affected, record_id) VALUES (?, ?, ?, ?)");
    $stmt->bind_param("issi", $user_id, $action, $entity_affected, $record_id);
    $stmt->execute();
}

// Authentication middleware
function authenticate() {
    $user_id = getAuthenticatedUser();
    
    if (!$user_id) {
        http_response_code(401);
        echo json_encode(['error' => 'Unauthorized. Valid authentication token required.']);
        exit;
    }
    
    return $user_id;
}

// Function to validate password strength
function validatePasswordStrength($password) {
    // Password must be at least 8 characters
    if (strlen($password) < 8) {
        return false;
    }
    
    // Password must contain at least one uppercase letter
    if (!preg_match('/[A-Z]/', $password)) {
        return false;
    }
    
    // Password must contain at least one lowercase letter
    if (!preg_match('/[a-z]/', $password)) {
        return false;
    }
    
    // Password must contain at least one number
    if (!preg_match('/[0-9]/', $password)) {
        return false;
    }
    
    // Password must contain at least one special character
    if (!preg_match('/[^A-Za-z0-9]/', $password)) {
        return false;
    }
    
    return true;
}

// Function to generate a random token
function generateResetToken() {
    return bin2hex(random_bytes(32));
}

// Handle different API endpoints
switch ($endpoint) {
    case 'login':
        // Handle login requests
        if ($method === 'POST') {
            try {
                // Log raw input for debugging
                error_log("Login Request Raw Input: " . file_get_contents("php://input"));
                
                // Get request body
                $data = json_decode(file_get_contents("php://input"), true);
                
                // Log parsed data
                error_log("Parsed Login Data: " . print_r($data, true));
                
                // Validate required fields
                if (!isset($data['email']) || !isset($data['password'])) {
                    error_log("Login Error: Missing email or password");
                    http_response_code(400);
                    echo json_encode(['error' => 'Email and password are required']);
                    exit;
                }
                
                // Additional debugging for database connection
                if ($conn->connect_error) {
                    error_log("Database Connection Error: " . $conn->connect_error);
                    http_response_code(500);
                    echo json_encode(['error' => 'Database connection failed']);
                    exit;
                }
                
                // Prepare statement to prevent SQL injection
                $stmt = $conn->prepare("SELECT user_id, password_hash FROM users WHERE email = ?");
                
                // Log statement preparation errors
                if (!$stmt) {
                    error_log("Statement Preparation Error: " . $conn->error);
                    http_response_code(500);
                    echo json_encode(['error' => 'Database query preparation failed: ' . $conn->error]);
                    exit;
                }
                
                $stmt->bind_param("s", $data['email']);
                $stmt->execute();
                $result = $stmt->get_result();
                
                // Log query execution details
                error_log("Login Query Result Rows: " . $result->num_rows);
                
                if ($result->num_rows === 0) {
                    error_log("Login Attempt: User not found - " . $data['email']);
                    http_response_code(401);
                    echo json_encode(['error' => 'Invalid credentials']);
                    exit;
                }
                
                $user = $result->fetch_assoc();
                
                // Verify password with detailed logging
                $passwordVerified = password_verify($data['password'], $user['password_hash']);
                
                error_log("Password Verification Result: " . ($passwordVerified ? 'Success' : 'Failed'));
                
                if ($passwordVerified) {
                    // Generate JWT token
                    $token = createJWT($user['user_id']);
                    
                    // Log successful login
                    log_action($user['user_id'], 'LOGIN', 'USER', $user['user_id']);
                    
                    echo json_encode(['token' => $token]);
                } else {
                    error_log("Login Attempt: Invalid password for user - " . $data['email']);
                    http_response_code(401);
                    echo json_encode(['error' => 'Invalid credentials']);
                }
            } catch (Exception $e) {
                // Log any unexpected errors
                error_log("Login Exception: " . $e->getMessage());
                http_response_code(500);
                echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;

        case 'forgot-password':
            // Handle forgot password requests
            if ($method === 'POST') {
                try {
                    // Get raw input
                    $rawInput = file_get_contents('php://input');
                    error_log("Raw Input: " . $rawInput);
        
                    // Parse JSON input
                    $data = json_decode($rawInput, true);
        
                    // Check for JSON parsing errors
                    if (json_last_error() !== JSON_ERROR_NONE) {
                        error_log("JSON Parsing Error: " . json_last_error_msg());
                        http_response_code(400);
                        echo json_encode([
                            'status' => 'error',
                            'message' => 'Invalid JSON input',
                            'error_details' => json_last_error_msg()
                        ]);
                        exit;
                    }
        
                    // Validate input
                    if (!isset($data['email']) || !filter_var($data['email'], FILTER_VALIDATE_EMAIL)) {
                        http_response_code(400);
                        echo json_encode([
                            'status' => 'error',
                            'message' => 'Invalid or missing email address'
                        ]);
                        exit;
                    }
        
                    // Include mail sender functions
                    require_once 'mail_sender.php';
                    
                    // Make sure database connection is valid
                    if ($conn->connect_error) {
                        http_response_code(500);
                        echo json_encode([
                            'status' => 'error',
                            'message' => 'Database connection failed'
                        ]);
                        exit;
                    }
                    
                    // Check if email exists
                    $stmt = $conn->prepare("SELECT user_id, email, full_name FROM users WHERE email = ?");
                    $stmt->bind_param("s", $data['email']);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result->num_rows === 0) {
                        // Don't reveal that email doesn't exist for security reasons
                        echo json_encode([
                            'status' => 'success',
                            'message' => 'If this email is registered, password reset instructions will be sent.'
                        ]);
                        exit;
                    }
                    
                    $user = $result->fetch_assoc();
                    
                    // Generate a reset token
                    $token = generateResetToken();
                    $expiry = date('Y-m-d H:i:s', strtotime('+1 hour'));
                    
                    // Check if a reset request already exists for this user
                    $stmt = $conn->prepare("SELECT * FROM password_reset_tokens WHERE user_id = ?");
                    $stmt->bind_param("i", $user['user_id']);
                    $stmt->execute();
                    $result = $stmt->get_result();
                    
                    if ($result->num_rows > 0) {
                        // Update existing token
                        $stmt = $conn->prepare("UPDATE password_reset_tokens SET token = ?, expires_at = ? WHERE user_id = ?");
                        $stmt->bind_param("ssi", $token, $expiry, $user['user_id']);
                    } else {
                        // Insert new token
                        $stmt = $conn->prepare("INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES (?, ?, ?)");
                        $stmt->bind_param("iss", $user['user_id'], $token, $expiry);
                    }
                    
                    if ($stmt->execute()) {
                        // Log the action
                        log_action($user['user_id'], 'PASSWORD_RESET_REQUEST', 'USER', $user['user_id']);
                        
                        // Build the reset link for debug purposes
                        $resetLink = "http://{$_SERVER['HTTP_HOST']}/prs/reset-password.html?token=$token";
                        
                        // Send the email with the reset link
                        $emailSent = sendPasswordResetEmail($user['email'], $token, $user['full_name']);
                        
                        // Log the email sending result for debugging
                        error_log("Email sending to {$user['email']} result: " . ($emailSent ? "Success" : "Failed"));
                        
                        if ($emailSent) {
                            // Email sent successfully
                            echo json_encode([
                                'status' => 'success',
                                'message' => 'Password reset instructions have been sent to your email.'
                            ]);
                        } else {
                            // Email sending failed but token was created
                            // Include the debug link in the response
                            echo json_encode([
                                'status' => 'success',
                                'message' => 'Password reset instructions have been sent to your email.',
                                'debug_link' => $resetLink, // This will be shown to the user in development mode
                                'debug_info' => 'Email could not be sent, but reset token was created. Using debug link instead.'
                            ]);
                        }
                    } else {
                        http_response_code(500);
                        echo json_encode([
                            'status' => 'error',
                            'message' => 'Failed to process password reset request',
                            'error_details' => $conn->error
                        ]);
                    }
                } catch (Exception $e) {
                    // More comprehensive error logging
                    error_log("Forgot Password Error: " . $e->getMessage());
                    error_log("Trace: " . $e->getTraceAsString());
        
                    http_response_code(500);
                    echo json_encode([
                        'status' => 'error',
                        'message' => 'An unexpected error occurred',
                        'error_details' => $e->getMessage()
                    ]);
                }
            } else {
                http_response_code(405);
                echo json_encode([
                    'status' => 'error',
                    'message' => 'Method not allowed'
                ]);
            }
            break;
        
    case 'reset-password':
        // Handle password reset
        if ($method === 'POST') {
            try {
                // Get request body
                $data = json_decode(file_get_contents("php://input"), true);
                
                // Validate required fields
                if (!isset($data['token']) || !isset($data['password'])) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Token and password are required']);
                    exit;
                }
                
                // Validate password strength
                if (!validatePasswordStrength($data['password'])) {
                    http_response_code(400);
                    echo json_encode([
                        'error' => 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
                    ]);
                    exit;
                }
                
                // Make sure database connection is valid
                if ($conn->connect_error) {
                    http_response_code(500);
                    echo json_encode(['error' => 'Database connection failed']);
                    exit;
                }
                
               

                #Let me continue with the rest of the API implementation:
                $now = date('Y-m-d H:i:s');
                $stmt = $conn->prepare("SELECT * FROM password_reset_tokens WHERE token = ? AND expires_at > ?");
                $stmt->bind_param("ss", $data['token'], $now);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    http_response_code(400);
                    echo json_encode(['error' => 'Invalid or expired token. Please request a new password reset.']);
                    exit;
                }
                
                $tokenData = $result->fetch_assoc();
                $user_id = $tokenData['user_id'];
                
                // Update user's password
                $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
                $stmt = $conn->prepare("UPDATE users SET password_hash = ? WHERE user_id = ?");
                $stmt->bind_param("si", $password_hash, $user_id);
                
                if ($stmt->execute()) {
                    // Delete the used token
                    $stmt = $conn->prepare("DELETE FROM password_reset_tokens WHERE token = ?");
                    $stmt->bind_param("s", $data['token']);
                    $stmt->execute();
                    
                    // Log the action
                    log_action($user_id, 'PASSWORD_RESET', 'USER', $user_id);
                    
                    echo json_encode([
                        'status' => 'success',
                        'message' => 'Password has been reset successfully.'
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to reset password: ' . $conn->error]);
                }
            } catch (Exception $e) {
                http_response_code(500);
                echo json_encode(['error' => 'Server error: ' . $e->getMessage()]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    case 'users':
        // Handle user-related requests
        $id = $request[1] ?? null;
        
        if ($method === 'GET') {
            // User authentication required for all GET requests
            $auth_user_id = authenticate();
            
            if ($id) {
                // Get specific user
                $stmt = $conn->prepare("SELECT u.user_id, u.full_name, u.email, u.phone, u.national_id, u.prs_id, u.created_at, r.role_name 
                                        FROM users u 
                                        JOIN roles r ON u.role_id = r.role_id 
                                        WHERE u.user_id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    http_response_code(404);
                    echo json_encode(['error' => 'User not found']);
                    exit;
                }
                
                $user = $result->fetch_assoc();
                echo json_encode($user);
            } else {
                // Get all users
                $result = $conn->query("SELECT u.user_id, u.full_name, u.email, u.phone, u.national_id, u.prs_id, u.created_at, r.role_name 
                                        FROM users u 
                                        JOIN roles r ON u.role_id = r.role_id");
                
                $users = [];
                while ($row = $result->fetch_assoc()) {
                    $users[] = $row;
                }
                
                echo json_encode($users);
            }
        } elseif ($method === 'POST') {
            // Create new user
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['full_name']) || !isset($data['email']) || !isset($data['password']) || !isset($data['role_id'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Validate password strength
            if (!validatePasswordStrength($data['password'])) {
                http_response_code(400);
                echo json_encode([
                    'error' => 'Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.'
                ]);
                exit;
            }
            
            // Generate a unique PRS ID
            $prs_id = 'PRS' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
            
            // Generate a national ID if not provided
            $national_id = $data['national_id'] ?? 'ID' . str_pad(rand(1, 9999), 5, '0', STR_PAD_LEFT);
            
            // Hash password
            $password_hash = password_hash($data['password'], PASSWORD_DEFAULT);
            
            // Insert new user
            $stmt = $conn->prepare("INSERT INTO users (full_name, email, password_hash, phone, national_id, prs_id, role_id) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssssssi", 
                              $data['full_name'], 
                              $data['email'], 
                              $password_hash, 
                              $data['phone'], 
                              $national_id, 
                              $prs_id, 
                              $data['role_id']);
            
            if ($stmt->execute()) {
                $user_id = $conn->insert_id;
                
                // Log the action
                log_action($user_id, 'CREATE', 'USER', $user_id);
                
                http_response_code(201);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'User created successfully',
                    'user_id' => $user_id
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create user: ' . $conn->error]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    case 'vaccination-records':
        // Handle vaccination record-related requests
        $id = $request[1] ?? null;
        
        if ($method === 'GET') {
            // Authentication required for all vaccination record requests
            $auth_user_id = authenticate();
            
            if ($id) {
                // Get specific vaccination record
                $stmt = $conn->prepare("SELECT * FROM vaccination_records WHERE record_id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Vaccination record not found']);
                    exit;
                }
                
                $record = $result->fetch_assoc();
                echo json_encode($record);
            } else {
                // Get all vaccination records
                $result = $conn->query("SELECT vr.*, u.full_name FROM vaccination_records vr
                                        JOIN users u ON vr.user_id = u.user_id
                                        ORDER BY vr.date_administered DESC");
                
                $records = [];
                while ($row = $result->fetch_assoc()) {
                    $records[] = $row;
                }
                
                echo json_encode($records);
            }
        } elseif ($method === 'POST') {
            // Create new vaccination record - requires authentication
            $auth_user_id = authenticate();
            
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['user_id']) || !isset($data['vaccine_name']) || 
                !isset($data['date_administered']) || !isset($data['dose_number'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Insert new vaccination record
            $stmt = $conn->prepare("INSERT INTO vaccination_records 
                                   (user_id, vaccine_name, date_administered, dose_number, provider, lot_number, expiration_date) 
                                   VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ississs", 
                             $data['user_id'], 
                             $data['vaccine_name'], 
                             $data['date_administered'], 
                             $data['dose_number'], 
                             $data['provider'], 
                             $data['lot_number'], 
                             $data['expiration_date']);
            
            if ($stmt->execute()) {
                $record_id = $conn->insert_id;
                
                // Log the action
                log_action($auth_user_id, 'CREATE', 'VACCINATION_RECORD', $record_id);
                
                http_response_code(201);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Vaccination record created successfully',
                    'record_id' => $record_id
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create vaccination record: ' . $conn->error]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    case 'upload':
        // Handle document uploads
        if ($method === 'POST') {
            // Authentication required for file uploads
            $auth_user_id = authenticate();
            
            // Check if file was uploaded
            if (!isset($_FILES['file'])) {
                http_response_code(400);
                echo json_encode(['error' => 'No file uploaded']);
                exit;
            }
            
            $file = $_FILES['file'];
            
            // Validate file type
            $allowed_types = ['application/pdf', 'image/jpeg', 'image/png', 'image/gif'];
            if (!in_array($file['type'], $allowed_types)) {
                http_response_code(400);
                echo json_encode(['error' => 'Invalid file type. Only PDF, JPEG, PNG, and GIF files are allowed.']);
                exit;
            }
            
            // Create uploads directory if it doesn't exist
            $upload_dir = 'uploads/';
            if (!file_exists($upload_dir)) {
                mkdir($upload_dir, 0777, true);
            }
            
            // Generate unique filename
            $filename = uniqid() . '_' . basename($file['name']);
            $file_path = $upload_dir . $filename;
            
            // Move uploaded file
            if (move_uploaded_file($file['tmp_name'], $file_path)) {
                // Get related record ID if provided
                $related_record_id = $_POST['related_record_id'] ?? null;
                
                // Insert document record
                $stmt = $conn->prepare("INSERT INTO documents 
                                       (file_type, file_path, uploaded_by, related_record_id) 
                                       VALUES (?, ?, ?, ?)");
                $stmt->bind_param("ssii", 
                                 $file['type'], 
                                 $file_path, 
                                 $auth_user_id, 
                                 $related_record_id);
                
                if ($stmt->execute()) {
                    $document_id = $conn->insert_id;
                    
                    // Log the action
                    log_action($auth_user_id, 'UPLOAD', 'DOCUMENT', $document_id);
                    
                    echo json_encode([
                        'status' => 'success',
                        'message' => 'File uploaded successfully',
                        'document_id' => $document_id,
                        'file_path' => $file_path
                    ]);
                } else {
                    http_response_code(500);
                    echo json_encode(['error' => 'Failed to record document in database: ' . $conn->error]);
                }
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to upload file']);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
    
    case 'get-vaccination-data':
        // Handle data for charts
        if ($method === 'GET') {
            // Authentication required
            $auth_user_id = authenticate();
            
            $result = $conn->query("SELECT vr.*, u.full_name 
                                   FROM vaccination_records vr
                                   JOIN users u ON vr.user_id = u.user_id
                                   ORDER BY vr.date_administered ASC");
            
            $records = [];
            while ($row = $result->fetch_assoc()) {
                $records[] = $row;
            }
            
            echo json_encode($records);
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;
        
    case 'health-facilities':
        // Handle health facility-related requests
        $id = $request[1] ?? null;
        
        if ($method === 'GET') {
            // Authentication required for all health facility requests
            $auth_user_id = authenticate();
            
            if ($id) {
                // Get specific health facility
                $stmt = $conn->prepare("SELECT * FROM health_facilities WHERE facility_id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Health facility not found']);
                    exit;
                }
                
                $facility = $result->fetch_assoc();
                echo json_encode($facility);
            } else {
                // Get all health facilities
                $result = $conn->query("SELECT * FROM health_facilities ORDER BY facility_name ASC");
                
                $facilities = [];
                while ($row = $result->fetch_assoc()) {
                    $facilities[] = $row;
                }
                
                echo json_encode($facilities);
            }
        } elseif ($method === 'POST') {
            // Create new health facility - requires authentication
            $auth_user_id = authenticate();
            
            // Check user role (only Gov Officials can add health facilities)
            $stmt = $conn->prepare("SELECT role_id FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $auth_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if ($user['role_id'] != 1) {  // 1=Gov Official
                http_response_code(403);
                echo json_encode(['error' => 'You do not have permission to add health facilities']);
                exit;
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['facility_name']) || !isset($data['facility_type']) || !isset($data['address'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Insert new health facility
            $stmt = $conn->prepare("INSERT INTO health_facilities 
                                  (facility_name, facility_type, address, contact_number, email, capacity, status) 
                                  VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("sssssss", 
                             $data['facility_name'], 
                             $data['facility_type'], 
                             $data['address'], 
                             $data['contact_number'], 
                             $data['email'], 
                             $data['capacity'], 
                             $data['status']);
            
            if ($stmt->execute()) {
                $facility_id = $conn->insert_id;
                
                // Log the action
                log_action($auth_user_id, 'CREATE', 'HEALTH_FACILITY', $facility_id);
                
                http_response_code(201);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Health facility created successfully',
                    'facility_id' => $facility_id
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create health facility: ' . $conn->error]);
            }
        } elseif ($method === 'PUT') {
            // Update existing health facility
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Facility ID is required']);
                exit;
            }
            
            $auth_user_id = authenticate();
            
            // Check user role (only Gov Officials can update health facilities)
            $stmt = $conn->prepare("SELECT role_id FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $auth_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if ($user['role_id'] != 1) {  // 1=Gov Official
                http_response_code(403);
                echo json_encode(['error' => 'You do not have permission to update health facilities']);
                exit;
            }
            
            // Check if facility exists
            $stmt = $conn->prepare("SELECT * FROM health_facilities WHERE facility_id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Health facility not found']);
                exit;
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['facility_name']) || !isset($data['facility_type']) || !isset($data['address'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Update health facility
            $stmt = $conn->prepare("UPDATE health_facilities 
                                  SET facility_name = ?, facility_type = ?, address = ?, 
                                      contact_number = ?, email = ?, capacity = ?, status = ? 
                                  WHERE facility_id = ?");
            $stmt->bind_param("sssssssi", 
                             $data['facility_name'], 
                             $data['facility_type'], 
                             $data['address'], 
                             $data['contact_number'], 
                             $data['email'], 
                             $data['capacity'], 
                             $data['status'],
                             $id);
            
            if ($stmt->execute()) {
                // Log the action
                log_action($auth_user_id, 'UPDATE', 'HEALTH_FACILITY', $id);
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Health facility updated successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update health facility: ' . $conn->error]);
            }
        } elseif ($method === 'DELETE') {
            // Delete health facility
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Facility ID is required']);
                exit;
            }
            
            $auth_user_id = authenticate();
            
            // Check user role (only Gov Officials can delete health facilities)
            $stmt = $conn->prepare("SELECT role_id FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $auth_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if ($user['role_id'] != 1) {  // 1=Gov Official
                http_response_code(403);
                echo json_encode(['error' => 'You do not have permission to delete health facilities']);
                exit;
            }
            
            // Check if facility exists
            $stmt = $conn->prepare("SELECT * FROM health_facilities WHERE facility_id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Health facility not found']);
                exit;
            }
            
            // Delete facility
            $stmt = $conn->prepare("DELETE FROM health_facilities WHERE facility_id = ?");
            $stmt->bind_param("i", $id);
            
            if ($stmt->execute()) {
                // Log the action
                log_action($auth_user_id, 'DELETE', 'HEALTH_FACILITY', $id);
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Health facility deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to delete health facility: ' . $conn->error]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        break;

    case 'supply-inventory':
        // Handle supply inventory-related requests
        $id = $request[1] ?? null;
        
        if ($method === 'GET') {
            // Authentication required for all inventory requests
            $auth_user_id = authenticate();
            
            if ($id) {
                // Get specific inventory item
                $stmt = $conn->prepare("SELECT * FROM supply_inventory WHERE inventory_id = ?");
                $stmt->bind_param("i", $id);
                $stmt->execute();
                $result = $stmt->get_result();
                
                if ($result->num_rows === 0) {
                    http_response_code(404);
                    echo json_encode(['error' => 'Inventory item not found']);
                    exit;
                }
                
                $item = $result->fetch_assoc();
                echo json_encode($item);
            } else {
                // Get all inventory items with optional filtering
                $query = "SELECT si.*, u.full_name as updated_by_name 
                         FROM supply_inventory si
                         LEFT JOIN users u ON si.updated_by = u.user_id";
                
                // Add filters if provided
                $where_clauses = [];
                $params = [];
                $types = "";
                
                if (isset($_GET['item_type'])) {
                    $where_clauses[] = "si.item_type = ?";
                    $params[] = $_GET['item_type'];
                    $types .= "s";
                }
                
                if (isset($_GET['location'])) {
                    $where_clauses[] = "si.location LIKE ?";
                    $params[] = "%" . $_GET['location'] . "%";
                    $types .= "s";
                }
                
                if (!empty($where_clauses)) {
                    $query .= " WHERE " . implode(" AND ", $where_clauses);
                }
                
                $query .= " ORDER BY si.last_updated DESC";
                
                // Prepare and execute the query with potential parameters
                $stmt = $conn->prepare($query);
                if (!empty($params)) {
                    $stmt->bind_param($types, ...$params);
                }
                $stmt->execute();
                $result = $stmt->get_result();
                
                $items = [];
                while ($row = $result->fetch_assoc()) {
                    $items[] = $row;
                }
                
                echo json_encode($items);
            }
        } elseif ($method === 'POST') {
            // Create new inventory item - requires authentication
            $auth_user_id = authenticate();
            
            // Check user role (only Gov Officials and Merchants can add inventory)
            $stmt = $conn->prepare("SELECT role_id FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $auth_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if (!in_array($user['role_id'], [1, 2])) {  // 1=Gov Official, 2=Merchant
                http_response_code(403);
                echo json_encode(['error' => 'You do not have permission to add inventory items']);
                exit;
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['item_name']) || !isset($data['item_type']) || !isset($data['quantity'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Insert new inventory item
            $stmt = $conn->prepare("INSERT INTO supply_inventory 
                                  (item_name, item_type, quantity, location, batch_number, expiration_date, updated_by) 
                                  VALUES (?, ?, ?, ?, ?, ?, ?)");
            $stmt->bind_param("ssisssi", 
                             $data['item_name'], 
                             $data['item_type'], 
                             $data['quantity'], 
                             $data['location'], 
                             $data['batch_number'], 
                             $data['expiration_date'], 
                             $auth_user_id);
            
            if ($stmt->execute()) {
                $inventory_id = $conn->insert_id;
                
                // Log the action
                log_action($auth_user_id, 'CREATE', 'SUPPLY_INVENTORY', $inventory_id);
                
                http_response_code(201);
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Inventory item created successfully',
                    'inventory_id' => $inventory_id
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create inventory item: ' . $conn->error]);
            }
        } elseif ($method === 'PUT') {
            // Update existing inventory item
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Inventory ID is required']);
                exit;
            }
            
            $auth_user_id = authenticate();
            
            // Check user role (only Gov Officials and Merchants can update inventory)
            $stmt = $conn->prepare("SELECT role_id FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $auth_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if (!in_array($user['role_id'], [1, 2])) {  // 1=Gov Official, 2=Merchant
                http_response_code(403);
                echo json_encode(['error' => 'You do not have permission to update inventory items']);
                exit;
            }
            
            // Check if inventory item exists
            $stmt = $conn->prepare("SELECT * FROM supply_inventory WHERE inventory_id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Inventory item not found']);
                exit;
            }
            
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['item_name']) || !isset($data['item_type']) || !isset($data['quantity'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Missing required fields']);
                exit;
            }
            
            // Update inventory item
            $stmt = $conn->prepare("UPDATE supply_inventory 
                                  SET item_name = ?, item_type = ?, quantity = ?, location = ?, 
                                      batch_number = ?, expiration_date = ?, updated_by = ? 
                                  WHERE inventory_id = ?");
            $stmt->bind_param("ssisssii", 
                             $data['item_name'], 
                             $data['item_type'], 
                             $data['quantity'], 
                             $data['location'], 
                             $data['batch_number'], 
                             $data['expiration_date'], 
                             $auth_user_id,
                             $id);
            
            if ($stmt->execute()) {
                // Log the action
                log_action($auth_user_id, 'UPDATE', 'SUPPLY_INVENTORY', $id);
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Inventory item updated successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to update inventory item: ' . $conn->error]);
            }
        } elseif ($method === 'DELETE') {
            // Delete inventory item
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Inventory ID is required']);
                exit;
            }
            
            $auth_user_id = authenticate();
            
            // Check user role (only Gov Officials can delete inventory)
            $stmt = $conn->prepare("SELECT role_id FROM users WHERE user_id = ?");
            $stmt->bind_param("i", $auth_user_id);
            $stmt->execute();
            $result = $stmt->get_result();
            $user = $result->fetch_assoc();
            
            if ($user['role_id'] != 1) {  // 1=Gov Official
                http_response_code(403);
                echo json_encode(['error' => 'You do not have permission to delete inventory items']);
                exit;
            }
            
            // Check if inventory item exists
            $stmt = $conn->prepare("SELECT * FROM supply_inventory WHERE inventory_id = ?");
            $stmt->bind_param("i", $id);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(404);
                echo json_encode(['error' => 'Inventory item not found']);
                exit;
            }
            
            // Delete inventory item
            $stmt = $conn->prepare("DELETE FROM supply_inventory WHERE inventory_id = ?");
            $stmt->bind_param("i", $id);
            
            if ($stmt->execute()) {
                // Log the action
                log_action($auth_user_id, 'DELETE', 'SUPPLY_INVENTORY', $id);
                
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Inventory item deleted successfully'
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to delete inventory item: ' . $conn->error]);
            }
        } else {
            http_response_code(405);
            echo json_encode(['error' => 'Method not allowed']);
        }
        
        break;
        
    case 'test':
        // A simple test endpoint to verify API functionality
        header('Content-Type: application/json');
        echo json_encode(['status' => 'success', 'message' => 'API is working correctly']);
        break;
        
    default:
        // Handle unknown endpoints
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
 }
 
 // Close the database connection
 $conn->close();
 ?>