# User API with Razorpay Integration

API implementation featuring user authentication and subscription management with Razorpay payment integration for ₹199 monthly subscription.

## Features

- User registration and authentication
- JWT-based authorization
- Password encryption with bcryptjs
- Razorpay integration for subscription payments
- MongoDB integration for data storage

## Setup Instructions

### Prerequisites

- Node.js and npm installed
- MongoDB account/instance
- Razorpay account for payment integration

### Installation

1. Clone the repository

```bash
git clone <repository-url>
cd basic-apiBuilding
```

2. Install dependencies

```bash
npm install
```

3. Configure environment variables

Create or edit the `.env` file with the following variables:

```
PORT=3100
DATABASE_URL=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
```

4. Start the server

```bash
npm start
```

## API Endpoints

### User Authentication

- **POST /users/register** - Register a new user
  - Body: `{ "name": "User Name", "email": "user@example.com", "password": "password123" }`

- **POST /users/login** - Login and get authentication token
  - Body: `{ "email": "user@example.com", "password": "password123" }`

### User Profile

- **GET /users/profile** - Get user profile (Requires authentication)
  - Header: `Authorization: Bearer <token>`

### Subscription Management

- **POST /users/subscription/create** - Create a subscription order (Requires authentication)
  - Header: `Authorization: Bearer <token>`
  - Response includes Razorpay order details for front-end checkout

- **POST /users/subscription/verify** - Verify payment and activate subscription (Requires authentication)
  - Header: `Authorization: Bearer <token>`
  - Body: `{ "razorpay_payment_id": "...", "razorpay_order_id": "...", "razorpay_signature": "..." }`

- **GET /users/subscription** - Get subscription status (Requires authentication)
  - Header: `Authorization: Bearer <token>`

### Admin Authentication

- **POST /admin/register** - Register a new admin
  - Body: `{ "name": "Admin Name", "email": "admin@example.com", "password": "admin123" }`

- **POST /admin/login** - Admin login and get authentication token
  - Body: `{ "email": "admin@example.com", "password": "admin123" }`

### Admin Dashboard

- **GET /admin/dashboard** - Get dashboard statistics (Requires admin authentication)
  - Header: `Authorization: Bearer <token>`
  - Returns total users, active subscriptions, monthly revenue, and recent subscriptions

- **GET /admin/users** - Get all users with pagination (Requires admin authentication)
  - Header: `Authorization: Bearer <token>`
  - Query params: `page`, `limit`

- **GET /admin/users/:id** - Get specific user details (Requires admin authentication)
  - Header: `Authorization: Bearer <token>`

- **GET /admin/subscriptions** - Get subscription statistics (Requires admin authentication)
  - Header: `Authorization: Bearer <token>`
  - Returns subscription trends over past 6 months, active subscriptions, and total revenue

## Razorpay Integration

The API integrates with Razorpay for handling the ₹199 monthly subscription payments. The flow is:

1. User initiates subscription by calling `/users/subscription/create`
2. API creates Razorpay order and returns details to frontend
3. Frontend shows Razorpay payment form
4. After successful payment, frontend calls `/users/subscription/verify` with payment details
5. API verifies the payment signature and activates the subscription

## Original Express Setup

***EXPRESS INSTALL***
```bash
npm i -g express
```

***EXPRESS GENERATOR INSTALL***
```bash
npm install -g express-generator
```

***USING EXPRESS GENERATOR TO CREATE EXPRESS APP*** 
```bash
express --no-view==<projectname>
```
