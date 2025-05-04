<?php
// Database connection settings
// Get connection details from Railway environment variables
$host = getenv('MYSQLHOST') ?: 'localhost';
$dbname = getenv('MYSQLDATABASE') ?: 'prs_database';
$username = getenv('MYSQLUSER') ?: 'root';
$password = getenv('MYSQLPASSWORD') ?: '';
$port = getenv('MYSQLPORT') ?: '3306';

// Create a new mysqli connection
$conn = new mysqli($host, $username, $password, $dbname, (int)$port);

// Check connection
if ($conn->connect_error) {
    error_log("Database Connection Error: " . $conn->connect_error);
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to ensure proper handling of special characters
$conn->set_charset("utf8mb4");
?>