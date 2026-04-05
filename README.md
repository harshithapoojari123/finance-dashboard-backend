# Finance Dashboard Backend

A finance dashboard backend built with Node.js, Express, and MongoDB.

## Features

- User management with `viewer`, `analyst`, and `admin` roles
- Active and inactive user status handling
- JWT-based authentication
- Role-based access control enforced at the API layer
- Financial record CRUD with filtering, search, soft delete, and pagination
- Dashboard summary APIs for totals, recent activity, and monthly trends
- MongoDB persistence through Mongoose
- Structured validation and JSON error responses
- In-memory rate limiting for API and login protection
- Automated API tests against a temporary local MongoDB instance

## Tech Stack

- Node.js
- Express
- MongoDB
- Mongoose
- JSON Web Token
- Nodemon
- Node built-in test runner

## Project Structure

```text
src/
  app.js
  server.js
  config/
  middleware/
  models/
  routes/
  services/
  utils/
tests/
  api.test.js
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Start MongoDB locally if it is not already running

```bash
mongod --dbpath <your-db-path>
```

3. Run the API in development mode with auto-restart

```bash
npm run dev
```

4. Run the API normally

```bash
npm start
```

The server runs at `http://127.0.0.1:8000` by default.

## Environment Variables

- `PORT` default: `8000`
- `MONGO_URI` default: `mongodb://127.0.0.1:27017/finance_dashboard`
- `JWT_SECRET` default: `assignment-review-secret`
- `JWT_EXPIRES_IN` default: `30d`
- `SEED_ON_STARTUP` default: `true`
- `RATE_LIMIT_WINDOW_MS` default: `900000`
- `RATE_LIMIT_MAX` default: `200`
- `AUTH_RATE_LIMIT_MAX` default: `20`

## Assignment Review Note

JWT expiry is intentionally set to `30d` so the project remains easy for reviewers to test even if they open it days later. In a production system, a shorter-lived access token plus refresh-token rotation would be the better choice.

## Seed Users

On first startup, the app seeds these users:

1. `admin@dashboard.local` / `Admin123!`
2. `analyst@dashboard.local` / `Analyst123!`
3. `viewer@dashboard.local` / `Viewer123!`

## API Endpoints

### Auth

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

Admin only:

- `GET /api/users`
- `POST /api/users`
- `GET /api/users/:userId`
- `PATCH /api/users/:userId`

### Financial Records

Analyst and admin can read:

- `GET /api/records`
- `GET /api/records/:recordId`

Admin only for write actions:

- `POST /api/records`
- `PATCH /api/records/:recordId`
- `DELETE /api/records/:recordId`

Supported query params for `GET /api/records`:

- `type`
- `category`
- `start_date`
- `end_date`
- `search`
- `page`
- `page_size`
- `include_deleted=true` admin only
- `deleted_only=true` admin only

### Dashboard

Viewer, analyst, and admin can access:

- `GET /api/dashboard/summary`
- `GET /api/dashboard/recent-activity?limit=5`
- `GET /api/dashboard/trends?months=6`

## Example Usage

Login:

```bash
curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@dashboard.local","password":"Admin123!"}'
```

Search records:

```bash
curl "http://127.0.0.1:8000/api/records?search=client&type=expense" \
  -H "Authorization: Bearer <token>"
```

Create a record:

```bash
curl -X POST http://127.0.0.1:8000/api/records \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"amount":2450.75,"type":"income","category":"Consulting","date":"2026-04-03","notes":"Client payment"}'
```

Fetch dashboard summary:

```bash
curl http://127.0.0.1:8000/api/dashboard/summary \
  -H "Authorization: Bearer <token>"
```

## Validation and Error Handling

Examples of enforced behavior:

- Missing required fields return `400`
- Invalid credentials return `401`
- Unauthorized role actions return `403`
- Missing resources return `404`
- Duplicate user email returns `409`
- Rate limit violations return `429`

Error responses are returned in this shape:

```json
{
  "error": {
    "code": "validation_error",
    "message": "Field 'amount' must be greater than zero."
  }
}
```

## Testing

Run the API tests with:

```bash
npm test
```

The test suite starts a temporary local MongoDB process on port `27018`, connects the API to a test database, and validates role behavior, CRUD operations, filtering, summaries, soft delete behavior, search support, rate limiting, and validation errors.

## Design Notes

- Authentication uses signed JWT bearer tokens with a `30d` expiry for assignment-review convenience.
- Financial record deletion uses soft delete so data is hidden from normal reads and dashboard analytics instead of being permanently removed.
- Search support is implemented through case-insensitive matching on record category and notes.
- Rate limiting is implemented with lightweight in-memory middleware for assignment simplicity.
- Password hashing uses PBKDF2 from Node's built-in `crypto` module.
- Services contain the business logic while routes remain thin.
- Mongoose models define persistence and schema constraints.
- The earlier Python scaffold in this workspace was left untouched when switching to the requested Node.js + MongoDB implementation.
