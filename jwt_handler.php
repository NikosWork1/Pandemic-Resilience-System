<?php
// JWT Handler for managing authentication tokens

// Secret key for JWT encoding/decoding - should be kept secret in production
// In a real app, this should be stored in an environment variable
$JWT_SECRET = 'prs_secret_key_2024';

/**
 * Create a JWT token
 * @param int $user_id The ID of the authenticated user
 * @return string The JWT token
 */
function createJWT($user_id) {
    global $JWT_SECRET;
    
    // Define token header
    $header = json_encode([
        'typ' => 'JWT',
        'alg' => 'HS256'
    ]);
    $header = base64_encode($header);
    
    // Define token payload with expiration (24 hours)
    $payload = json_encode([
        'user_id' => $user_id,
        'iat' => time(), // Issued at
        'exp' => time() + (60 * 60 * 24) // Expires in 24 hours
    ]);
    $payload = base64_encode($payload);
    
    // Create signature
    $signature = hash_hmac('sha256', "$header.$payload", $JWT_SECRET, true);
    $signature = base64_encode($signature);
    
    // Return complete token
    return "$header.$payload.$signature";
}

/**
 * Validate a JWT token
 * @param string $token The JWT token to validate
 * @return mixed The user ID if valid, false if invalid
 */
function validateJWT($token) {
    global $JWT_SECRET;
    
    // Check if token starts with "Bearer "
    if (strpos($token, 'Bearer ') === 0) {
        $token = substr($token, 7); // Remove "Bearer " prefix
    }
    
    // Split the token into its parts
    $parts = explode('.', $token);
    if (count($parts) !== 3) {
        return false; // Invalid token format
    }
    
    list($header, $payload, $signature) = $parts;
    
    // Verify signature
    $valid_signature = base64_encode(hash_hmac('sha256', "$header.$payload", $JWT_SECRET, true));
    if ($signature !== $valid_signature) {
        return false; // Invalid signature
    }
    
    // Decode payload
    $payload_data = json_decode(base64_decode($payload), true);
    
    // Check expiration
    if (isset($payload_data['exp']) && $payload_data['exp'] < time()) {
        return false; // Token expired
    }
    
    // Return user ID from token
    return $payload_data['user_id'] ?? false;
}

/**
 * Get the authenticated user ID from the current request
 * @return mixed The user ID if authenticated, false if not
 */
function getAuthenticatedUser() {
    $headers = getallheaders();
    
    if (!isset($headers['Authorization'])) {
        return false;
    }
    
    return validateJWT($headers['Authorization']);
}
?>