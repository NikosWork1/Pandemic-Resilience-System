<?php
// Mail configuration settings

// Option 1: Using PHP's mail() function (simplest, but limited)
$MAIL_USE_SMTP = true;  // Changed to true to use SMTP with Gmail

// Option 2: SMTP configuration (more reliable)
$SMTP_HOST = 'smtp.gmail.com';  // Gmail SMTP server
$SMTP_PORT = 587;              // Gmail TLS port
$SMTP_SECURE = 'tls';          // Use TLS for Gmail
$SMTP_AUTH = true;             // Gmail requires authentication
$SMTP_USERNAME = 'nikosbackend1@gmail.com';  // Your Gmail address
$SMTP_PASSWORD = 'udyexibgjfikupxq';     // ✅ App password with no spaces

// Email sender details
$MAIL_FROM_EMAIL = 'nikosbackend1@gmail.com';  // Same as your Gmail
$MAIL_FROM_NAME = 'Pandemic Resilience System';

// System URL (used for generating links)
$SYSTEM_URL = 'http://localhost/prs';  // Change this if your URL is different
?>
