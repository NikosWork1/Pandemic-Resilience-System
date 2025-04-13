# Pandemic Resilience System (PRS) Deployment Guide

## System Requirements

- Web Server: Apache 2.4+ with mod_rewrite enabled
- PHP: 7.4+ with mysqli extension
- MySQL: 5.7+ or MariaDB 10.3+
- SSL Certificate (for production)

## Local Deployment (XAMPP/LAMP)

1. **Install XAMPP/LAMP**
   - Download and install XAMPP from https://www.apachefriends.org/ or use your Linux package manager for LAMP
   - Start Apache and MySQL services

2. **Database Setup**
   - Create a database named 'prs_database'
   - Import the SQL script from database_schema.sql
   - Import test data (if needed) from test_data.sql

3. **Application Files**
   - Copy all project files to the web root directory (usually C:\xampp\htdocs\prs\ on Windows or /var/www/html/prs/ on Linux)
   - Ensure the .htaccess file is properly configured

4. **Configuration**
   - Update db.php with the correct database credentials
   - Update jwt_handler.php with a secure JWT secret key

5. **Testing**
   - Open http://localhost/prs/ in your browser
   - Log in with the sample credentials:
     - Government Official: alice@gov.org / securepassword
     - Merchant: bob@merchant.com / merchantpass
     - Public Member: charlie@example.com / publicpass

## Cloud Deployment (AWS/DigitalOcean)

1. **Provision a Server**
   - Launch an Ubuntu 20.04 LTS server
   - Install LAMP stack:
     ```
     sudo apt update
     sudo apt install apache2 mysql-server php php-mysql php-json libapache2-mod-php
     ```
   - Configure firewall to allow HTTP (80) and HTTPS (443) traffic:
     ```
     sudo ufw allow 'Apache'
     sudo ufw allow 'OpenSSH'
     sudo ufw enable
     ```

2. **Database Setup**
   - Secure MySQL installation:
     ```
     sudo mysql_secure_installation
     ```
   - Create database and user:
     ```sql
     CREATE DATABASE prs_database;
     CREATE USER 'prs_user'@'localhost' IDENTIFIED BY 'your_secure_password';
     GRANT ALL PRIVILEGES ON prs_database.* TO 'prs_user'@'localhost';
     FLUSH PRIVILEGES;
     ```
   - Import the database schema:
     ```
     mysql -u prs_user -p prs_database < database_schema.sql
     ```

3. **Application Deployment**
   - Clone the repository or upload application files to /var/www/html/prs/
   - Set appropriate permissions:
     ```
     sudo chown -R www-data:www-data /var/www/html/prs/
     sudo chmod -R 755 /var/www/html/prs/
     ```
   - Enable the Apache rewrite module:
     ```
     sudo a2enmod rewrite
     sudo systemctl restart apache2
     ```

4. **Virtual Host Configuration**
   - Create a virtual host configuration file:
     ```
     sudo nano /etc/apache2/sites-available/prs.conf
     ```
   - Add the following configuration:
     ```
     <VirtualHost *:80>
         ServerName prs.yourdomain.com
         ServerAdmin webmaster@yourdomain.com
         DocumentRoot /var/www/html/prs
         
         <Directory /var/www/html/prs>
             Options -Indexes +FollowSymLinks
             AllowOverride All
             Require all granted
         </Directory>
         
         ErrorLog ${APACHE_LOG_DIR}/prs_error.log
         CustomLog ${APACHE_LOG_DIR}/prs_access.log combined
     </VirtualHost>
     ```
   - Enable the site and reload Apache:
     ```
     sudo a2ensite prs.conf
     sudo systemctl reload apache2
     ```

5. **SSL Configuration**
   - Install Let's Encrypt certbot:
     ```
     sudo apt install certbot python3-certbot-apache
     ```
   - Generate and configure SSL certificates:
     ```
     sudo certbot --apache -d prs.yourdomain.com
     ```

6. **Final Testing**
   - Test all functionality through the HTTPS URL
   - Verify API endpoints are secure and working correctly

## Security Checklist

- [ ] Database credentials are secure and not hardcoded
- [ ] JWT secret key is long, random, and secure
- [ ] All API endpoints have proper authentication
- [ ] Input validation is implemented on all forms
- [ ] File uploads are properly validated and secured
- [ ] HTTPS is enforced on production
- [ ] Error handling does not expose sensitive information
- [ ] User passwords are properly hashed
- [ ] Role-based access control is working correctly
- [ ] Regular backups are configured
- [ ] API rate limiting is implemented
- [ ] Audit logging is enabled and monitored