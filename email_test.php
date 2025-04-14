<?php
// PHPMailer Diagnostic Script

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Check Composer autoload
if (file_exists('vendor/autoload.php')) {
    require 'vendor/autoload.php';
    echo "✅ Composer autoload found.\n";
} else {
    echo "❌ Composer autoload NOT found.\n";
    exit(1);
}

// Check PHPMailer class exists
if (class_exists('PHPMailer\PHPMailer\PHPMailer')) {
    echo "✅ PHPMailer class found.\n";
} else {
    echo "❌ PHPMailer class NOT found.\n";
    exit(1);
}

echo "\n🔍 PHPMailer Diagnostic Complete\n";
?>