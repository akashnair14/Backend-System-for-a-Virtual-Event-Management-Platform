# Virtual Event Management Platform Backend

A RESTful backend system built with Node.js and Express for managing virtual events. The system handles user authentication, authorization (organizer vs. attendee roles), event scheduling, and event registrations. It utilizes secure password hashing, session tokens, and in-memory data structures.

---

## Features

- **User Authentication**: Secure registration (`POST /register`) and login (`POST /login`) with passwords hashed using `bcrypt` and session validation using JSON Web Tokens (JWT).
- **Role-based Authorization**: Restricts capabilities depending on user roles:
  - **Organizers**: Can perform full CRUD operations on events (`GET`, `POST`, `PUT`, `DELETE /events`). An organizer can only modify or delete events they created.
  - **Attendees**: Can browse events, register for events (`POST /events/:id/register`), view their event registrations (`GET /events/my-registrations`), and cancel registrations (`DELETE /events/:id/register`).
- **In-Memory Store**: Managed completely using local memory structures (arrays/objects) for user accounts and event lists.
- **Asynchronous Emailing**: Simulates email notification sending for user registration and event registration/cancellation using `async/await` and Promises.
- **Comprehensive Integration Tests**: Robust API test suite coverage using Jest and Supertest.
- **Interactive Swagger Documentation**: A built-in Swagger UI to explore and test the RESTful API endpoints visually at `/api-docs`.

---

## Tech Stack

- **Runtime Environment**: Node.js
- **Web Framework**: Express.js
- **Security**: 
  - `bcryptjs` for password hashing.
  - `jsonwebtoken` (JWT) for secure authentication tokens.
- **Services**: `nodemailer` (staged for email notifications, falling back to safe local console-logs/arrays during testing).
- **Testing**: Jest & Supertest.

---

## Getting Started

### Prerequisites
- Node.js (v16 or higher recommended)
- npm (Node Package Manager)

### Installation
1. Clone the repository or extract the project folder.
2. Navigate to the root directory and install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file in the root directory (or use the one provided):
   ```env
   PORT=5000
   JWT_SECRET=supersecretkeyforeventsmanagement
   NODE_ENV=development
   ```

### Running the Server
Start the server in development mode:
```bash
npm start
```
The API server will launch at `http://localhost:5000`. You can access the interactive Swagger documentation UI at `http://localhost:5000/api-docs`.

### Running Tests
Execute the automated Jest integration tests:
```bash
npm run test
```

---

## API Endpoints Reference

All request and response payloads are in JSON format. For protected routes, include the JWT token in the `Authorization` header as:
`Authorization: Bearer <your_jwt_token>`

### 1. Authentication

#### Register a New User
- **Endpoint**: `POST /register`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "username": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "role": "attendee" 
  }
  ```
  *(Note: `role` must be either `"attendee"` or `"organizer"`. Defaults to `"attendee"` if omitted).*
- **Response (201 Created)**:
  ```json
  {
    "message": "User registered successfully",
    "user": {
      "id": "user_1719504620000",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "attendee"
    }
  }
  ```

#### User Login
- **Endpoint**: `POST /login`
- **Access**: Public
- **Request Body**:
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Login successful",
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "user_1719504620000",
      "username": "john_doe",
      "email": "john@example.com",
      "role": "attendee"
    }
  }
  ```

---

### 2. Event Management (Organizers Only)

#### Create an Event
- **Endpoint**: `POST /events`
- **Access**: Organizer Role Required
- **Request Body**:
  ```json
  {
    "title": "Intro to Web Development",
    "description": "Learn Express and JWT from scratch.",
    "date": "2026-08-15",
    "time": "14:00",
    "capacity": 100
  }
  ```
- **Response (201 Created)**:
  ```json
  {
    "message": "Event created successfully",
    "event": {
      "id": "event_1719504830000",
      "title": "Intro to Web Development",
      "description": "Learn Express and JWT from scratch.",
      "date": "2026-08-15",
      "time": "14:00",
      "capacity": 100,
      "createdBy": "user_1719504620000",
      "participants": []
    }
  }
  ```

#### Update an Event
- **Endpoint**: `PUT /events/:id`
- **Access**: Organizer Role Required (must be the creator of the event)
- **Request Body** (Only provide fields you want to update):
  ```json
  {
    "title": "Advanced Web Development",
    "capacity": 120
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "message": "Event updated successfully",
    "event": {
      "id": "event_1719504830000",
      "title": "Advanced Web Development",
      ...
    }
  }
  ```

#### Delete an Event
- **Endpoint**: `DELETE /events/:id`
- **Access**: Organizer Role Required (must be the creator of the event)
- **Response (200 OK)**:
  ```json
  {
    "message": "Event deleted successfully"
  }
  ```

---

### 3. Event Consumption & Registration (Attendees)

#### Fetch All Events
- **Endpoint**: `GET /events`
- **Access**: Authenticated Users
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "event_1719504830000",
      "title": "Advanced Web Development",
      "description": "Learn Express and JWT from scratch.",
      "date": "2026-08-15",
      "time": "14:00",
      "capacity": 120,
      "createdBy": "user_1719504620000",
      "participants": [],
      "organizer": {
        "id": "user_1719504620000",
        "username": "jane_organizer",
        "email": "jane@example.com"
      }
    }
  ]
  ```

#### Fetch Single Event Details
- **Endpoint**: `GET /events/:id`
- **Access**: Authenticated Users (returns populated list of registered participant profiles)
- **Response (200 OK)**:
  ```json
  {
    "id": "event_1719504830000",
    "title": "Advanced Web Development",
    "description": "Learn Express and JWT from scratch.",
    "date": "2026-08-15",
    "time": "14:00",
    "capacity": 120,
    "createdBy": "user_1719504620000",
    "participants": [
      {
        "id": "user_1719504629999",
        "username": "john_doe",
        "email": "john@example.com"
      }
    ],
    "organizer": {
      "id": "user_1719504620000",
      "username": "jane_organizer",
      "email": "jane@example.com"
    }
  }
  ```

#### Register for an Event
- **Endpoint**: `POST /events/:id/register`
- **Access**: Attendee Role Required
- **Response (200 OK)** (Sends confirmation email asynchronously):
  ```json
  {
    "message": "Successfully registered for the event",
    "event": {
      "id": "event_1719504830000",
      "title": "Advanced Web Development",
      "date": "2026-08-15",
      "time": "14:00"
    }
  }
  ```

#### View My Event Registrations
- **Endpoint**: `GET /events/my-registrations`
- **Access**: Attendee Role Required
- **Response (200 OK)**:
  ```json
  [
    {
      "id": "event_1719504830000",
      "title": "Advanced Web Development",
      "description": "Learn Express and JWT from scratch.",
      "date": "2026-08-15",
      "time": "14:00",
      "organizer": {
        "id": "user_1719504620000",
        "username": "jane_organizer",
        "email": "jane@example.com"
      }
    }
  ]
  ```

#### Cancel Event Registration
- **Endpoint**: `DELETE /events/:id/register`
- **Access**: Attendee Role Required
- **Response (200 OK)** (Sends cancellation email asynchronously):
  ```json
  {
    "message": "Registration cancelled successfully"
  }
  ```
