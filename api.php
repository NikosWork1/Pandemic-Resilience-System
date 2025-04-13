<?php
// Include required files
require 'db.php';
require 'jwt_handler.php';

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
if (isset($_SERVER['PATH_INFO'])) {
    $path_info = $_SERVER['PATH_INFO'];
} else {
    $path_info = str_replace($base_path, '', $request_uri);
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

// Handle different API endpoints
switch ($endpoint) {
    case 'login':
        // Handle login requests
        if ($method === 'POST') {
            $data = json_decode(file_get_contents("php://input"), true);
            
            // Validate required fields
            if (!isset($data['email']) || !isset($data['password'])) {
                http_response_code(400);
                echo json_encode(['error' => 'Email and password are required']);
                exit;
            }
            
            // Prepare statement to prevent SQL injection
            $stmt = $conn->prepare("SELECT user_id, password_hash FROM users WHERE email = ?");
            $stmt->bind_param("s", $data['email']);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result->num_rows === 0) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
                exit;
            }
            
            $user = $result->fetch_assoc();
            
            // Verify password
            if (password_verify($data['password'], $user['password_hash']) || hash('sha256', $data['password']) === $user['password_hash']) {
                // Generate JWT token
                $token = createJWT($user['user_id']);
                
                // Log the login action
                log_action($user['user_id'], 'LOGIN', 'USER', $user['user_id']);
                
                echo json_encode(['token' => $token]);
            } else {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid credentials']);
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
        
    default:
        // Handle unknown endpoints
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}

// Close the database connection
$conn->close();
?>