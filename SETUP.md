Eequ Recruit API
================

The Eequ Recruit API is designed to manage users and products, offering a secure foundation with role-based access control and efficient data handling.

📌 Key Features
---------------

*   **User Management**: retrieve users by **first name** with automatic data masking for non-admin users.
*   **Product Management**: create and manage products with strict **ownership-based permissions** (owners/admins only).
*   **Secure Authentication**: full JWT implementation protecting sensitive operations.

📌 Prerequisites
----------------

*   **Node.js**: Version **v22**
*   **NPM**
*   **NVM** (Node Version Manager)
*   **Docker** (required for database and full app execution)

⚙️ Setup Instructions
---------------------

### 1️⃣ Clone the Repository

    git clone https://github.com/eequ/eequ-recruit 
    cd eequ-recruit

### 2️⃣ Use the Correct Node Version

    nvm use

🚀 Running the Application
--------------------------

### 1\. Recommended: Using Docker

Ensure your Docker software is running.

1.  Run the app with Docker (this will bootstrap everything: the backend, database, migrations, and seeders):
    
        npm run start:docker
    
2.  Open your browser and head to **Swagger API Docs** to test the app: 

        http://localhost:3000/api

### 2\. Alternative: Manual Setup

1.  Use Node.js v22:
    
        nvm use
    
2.  Install dependencies:
    
        npm install

3.  Build the project:

        npm run build

4.  Set up environment variables:

        cp .env.example .env
    
5.  Start the database services (MySQL & Redis) using Docker:
    
        npm run infra:up

6.  Run database migrations:
    
        npm run migration:run

7.  Run seeders:
    
        npm run seed
    
8.  Start the application:
    
        npm run start:dev
    
9.  Open your browser and head to **Swagger API Docs** to test the app: 

        http://localhost:3000/api


🧪 Running Tests
----------------

### 1\. Unit and Integration Tests

Run all unit and integration tests using **Jest**:

    npm run test

### 2\. End-to-End (E2E) Tests

Run end-to-end tests using **Jest**:

    npm run test:e2e

The end-to-end tests will execute the test suites located in the `test/suites` directory.

📜 API Documentation
--------------------

The API documentation (Swagger UI) is available at:

    http://localhost:3000/api

