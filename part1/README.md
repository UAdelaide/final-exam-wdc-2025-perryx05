# Dog Walking Service API

A Node.js/Express API for managing dog walking services.

## Setup

1. Ensure MySQL is running:
   ```bash
   service mysql start
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

The server will run on port 3000 by default.

## Database

The application automatically creates the `DogWalkService` database and populates it with test data on startup.

## API Endpoints

### GET /api/dogs
Returns all dogs with their size and owner's username.

**Sample Response:**
```json
[
  {
    "dog_name": "Max",
    "size": "medium",
    "owner_username": "alice123"
  },
  {
    "dog_name": "Bella",
    "size": "small",
    "owner_username": "carol123"
  }
]
```

### GET /api/walkrequests/open
Returns all open walk requests with dog name, requested time, location, and owner's username.

**Sample Response:**
```json
[
  {
    "request_id": 1,
    "dog_name": "Max",
    "requested_time": "2025-06-10T08:00:00.000Z",
    "duration_minutes": 30,
    "location": "Parklands",
    "owner_username": "alice123"
  }
]
```

### GET /api/walkers/summary
Returns a summary of each walker with their average rating and number of completed walks.

**Sample Response:**
```json
[
  {
    "walker_username": "bobwalker",
    "total_ratings": 2,
    "average_rating": 4.5,
    "completed_walks": 2
  },
  {
    "walker_username": "newwalker",
    "total_ratings": 0,
    "average_rating": null,
    "completed_walks": 0
  }
]
```

## Testing

You can test the endpoints using curl or by visiting the URLs in your browser:

- http://localhost:3000/api/dogs
- http://localhost:3000/api/walkrequests/open
- http://localhost:3000/api/walkers/summary