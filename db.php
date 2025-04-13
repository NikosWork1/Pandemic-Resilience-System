<?php
// Database connection settings
$host = 'localhost';
$dbname = 'prs_database';
$username = 'root'; // Default XAMPP username
$password = ''; // Default XAMPP password (empty)

// Create a new mysqli connection
$conn = new mysqli($host, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to ensure proper handling of special characters
$conn->set_charset("utf8mb4");
?>