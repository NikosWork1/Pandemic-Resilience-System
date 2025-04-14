<?php
// Include mail configuration
require_once 'mail_config.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

/**
 * Send email using configured method (PHP mail or SMTP)
 * 
 * @param string $to Recipient email address
 * @param string $subject Email subject
 * @param string $message Email body (HTML)
 * @param string $from_email Sender email (optional, uses config default)
 * @param string $from_name Sender name (optional, uses config default)
 * @return bool Success status
 */
function sendEmail($to, $subject, $message, $from_email = null, $from_name = null) {
    global $MAIL_USE_SMTP, $MAIL_FROM_EMAIL, $MAIL_FROM_NAME;
    global $SMTP_HOST, $SMTP_PORT, $SMTP_SECURE, $SMTP_AUTH, $SMTP_USERNAME, $SMTP_PASSWORD;
    
    // Use default sender info if not provided
    $from_email = $from_email ?: $MAIL_FROM_EMAIL;
    $from_name = $from_name ?: $MAIL_FROM_NAME;
    
    // Log attempt (for debugging)
    error_log("Attempting to send email to {$to} with subject: {$subject}");
    
    if (!$MAIL_USE_SMTP) {
        // Use PHP's mail() function
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$from_name} <{$from_email}>\r\n";
        $headers .= "Reply-To: {$from_email}\r\n";
        $headers .= "X-Mailer: PHP/" . phpversion() . "\r\n";
        
        $success = mail($to, $subject, $message, $headers);
        error_log("Mail attempt result: " . ($success ? "Success" : "Failed"));
        return $success;
    } else {
        // Use SMTP via PHPMailer
        try {
            // Require PHPMailer autoload
            require_once 'vendor/autoload.php';
            
            $mail = new PHPMailer(true);
            
            // Server settings
            $mail->isSMTP();
            $mail->Host       = $SMTP_HOST;
            $mail->SMTPAuth   = $SMTP_AUTH;
            $mail->Username   = $SMTP_USERNAME;
            $mail->Password   = $SMTP_PASSWORD;
            $mail->SMTPSecure = $SMTP_SECURE;
            $mail->Port       = $SMTP_PORT;
            
            // Recipients
            $mail->setFrom($from_email, $from_name);
            $mail->addAddress($to);
            
            // Content
            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $message;
            
            $success = $mail->send();
            error_log("SMTP mail attempt result: " . ($success ? "Success" : "Failed"));
            return $success;
        } catch (Exception $e) {
            error_log("SMTP Error: " . $mail->ErrorInfo);
            return false;
        }
    }
}

/**
 * Send password reset email
 * 
 * @param string $to Recipient email address
 * @param string $token Reset token
 * @param string $username User's name (optional)
 * @return bool Success status
 */
function sendPasswordResetEmail($to, $token, $username = '') {
    global $SYSTEM_URL;
    
    // Build the reset link
    $resetLink = "{$SYSTEM_URL}/reset-password.html?token={$token}";
    
    // Create a personalized greeting if username is provided
    $greeting = $username ? "Hello {$username}," : "Hello,";
    
    // Create HTML email
    $subject = "Password Reset Request - Pandemic Resilience System";
    
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #0d6efd; color: white; padding: 10px 20px; border-radius: 5px 5px 0 0; }
            .content { background-color: #f8f9fa; padding: 20px; border-radius: 0 0 5px 5px; }
            .button { display: inline-block; background-color: #0d6efd; color: white; padding: 10px 20px; 
                      text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { font-size: 12px; color: #6c757d; margin-top: 30px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h2>Password Reset</h2>
            </div>
            <div class='content'>
                <p>{$greeting}</p>
                <p>We received a request to reset your password for the Pandemic Resilience System. If you didn't make this request, you can safely ignore this email.</p>
                <p>To reset your password, click the button below:</p>
                <a href='{$resetLink}' class='button'>Reset Password</a>
                <p>Or copy and paste this URL into your browser:</p>
                <p>{$resetLink}</p>
                <p>This password reset link will expire in 1 hour for security reasons.</p>
                <p>Thank you,<br>Pandemic Resilience System Team</p>
                <div class='footer'>
                    <p>This is an automated message, please do not reply to this email.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    ";
    
    return sendEmail($to, $subject, $message);
}

// Test function - remove in production
function testMailSending() {
    $result = sendPasswordResetEmail('test@example.com', 'test_token_12345', 'Test User');
    return $result ? "Test email sent successfully!" : "Failed to send test email.";
}
?>