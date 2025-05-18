Pandemic Resilience System (PRS)
A comprehensive web-based platform for managing pandemic-related activities, including vaccination tracking, supply chain management, and public health monitoring.


🌐 Live Demo
The system is deployed and accessible at:
https://pandemic-resilience-system-production.up.railway.app/
📋 Overview
The Pandemic Resilience System (PRS) is built using PHP, MySQL, JavaScript (Chart.js), and Apache. It provides a complete solution for pandemic management with role-based access control, allowing government officials, healthcare providers, merchants, and the public to access appropriate features.

Key Features

User Management: Registration, authentication, and role-based access control
Vaccination Tracking: Record and monitor vaccination administration
Critical Items Management: Track essential pandemic supplies
Merchant Registration: Allow businesses to register and manage inventory
Document Upload: Secure storage and management of health-related documents
Data Visualization: Interactive charts for monitoring pandemic metrics
Audit Logging: Comprehensive activity tracking for security

🔑 Demo Credentials
You can test the system with the following accounts:
RoleEmailPasswordGovernment Officialsarah.johnson@health.govpassword123Merchantrobert.williams@medsupply.compassword123Public Memberpatricia.moore@email.compassword123Healthcare Providerdaniel.anderson@hospital.orgpassword123System Administratoradmin@prs-system.orgpassword123
🛠️ Technology Stack

Backend: PHP 7.4+
Database: MySQL/MariaDB
Frontend: HTML5, CSS3, JavaScript, Bootstrap 5
Data Visualization: Chart.js
Mapping: Leaflet.js
Authentication: JWT (JSON Web Tokens)
Deployment: Railway (Cloud Platform)

🏗️ Project Structure
/prs/
├── api.php                # Main API handling all endpoints
├── db.php                 # Database connection configuration
├── jwt_handler.php        # JWT authentication functions
├── css/
│   └── styles.css         # Main stylesheet
├── js/
│   ├── scripts.js         # Core JavaScript functionality
│   ├── forgot_password.js # Password recovery
│   ├── critical_items.js  # Critical items management
│   └── [other js files]   # Feature-specific functionality
├── *.html                 # Frontend pages
└── uploads/               # Document upload directory
📥 Installation
Requirements

Web Server: Apache 2.4+ with mod_rewrite enabled
PHP: 7.4+ with mysqli, json, and openssl extensions
MySQL: 5.7+ or MariaDB 10.3+
SSL Certificate (for production environments)

Local Setup

Clone this repository to your web server's document root:
git clone https://github.com/yourusername/pandemic-resilience-system.git prs

Create a MySQL database named prs_database and import the included schema.
Configure database connection in db.php:
php$host = 'localhost';  // Or your database host
$dbname = 'prs_database';
$username = 'root';   // Your database username
$password = '';       // Your database password

Configure JWT secret key in jwt_handler.php:
php$secret_key = 'your_secret_key_here';

Ensure the uploads directory has write permissions:
chmod 755 uploads

Access the system through your web server, e.g., http://localhost/prs/

Deployment
The system is currently deployed on Railway. For a similar deployment:

Create a Railway account and install the Railway CLI.
Configure environment variables for database connection and JWT secret.
Deploy using:
railway up


🖥️ Usage
User Roles

Government Officials:

Full access to all system features
Can manage users, health facilities, and supply inventory
Can view all vaccination records and audit logs


Healthcare Providers:

Can add and manage vaccination records
Can upload medical documentation
Limited access to supply inventory


Doctors:

Can manage inventory of critical items
Can verify purchase eligibility
Can record purchases


Public Members:

Can view their own vaccination records
Can find nearby critical items
Limited access to system features



Key Workflows

Vaccination Recording:

Healthcare providers log in
Navigate to the dashboard
Add new vaccination record
Upload supporting documentation if needed


Critical Items Management:

Government officials can add critical items
Merchants can manage inventory
Public can locate items through the Item Locator


PRS-ID Management:

Government officials can generate and manage PRS-IDs
PRS-IDs are used for verifying eligibility for critical items



🔒 Security Features

JWT-based authentication
Password encryption using PHP's password_hash()
Role-based access control
Input validation and sanitization
Prepared statements for SQL queries
Comprehensive audit logging
File upload validation

📁 Documentation
Comprehensive documentation is available in the /docs directory:

API.docx: API endpoints and usage
Deployment.docx: Detailed deployment instructions
Frontend.docx: Frontend architecture and components
Security.docx: Security implementation details
User Manual.docx: End-user documentation


📧 Contact
For questions or support, please contact: xrysomallis1@gmaiil.com
