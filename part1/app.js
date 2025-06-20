var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('DROP DATABASE IF EXISTS DogWalkService');
    await connection.query('CREATE DATABASE DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    // Create the tables
    await db.execute(`
      CREATE TABLE Users (
          user_id INT AUTO_INCREMENT PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password_hash VARCHAR(255) NOT NULL,
          role ENUM('owner', 'walker') NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.execute(`
      CREATE TABLE Dogs (
          dog_id INT AUTO_INCREMENT PRIMARY KEY,
          owner_id INT NOT NULL,
          name VARCHAR(50) NOT NULL,
          size ENUM('small', 'medium', 'large') NOT NULL,
          FOREIGN KEY (owner_id) REFERENCES Users(user_id)
      )
    `);

    await db.execute(`
      CREATE TABLE WalkRequests (
          request_id INT AUTO_INCREMENT PRIMARY KEY,
          dog_id INT NOT NULL,
          requested_time DATETIME NOT NULL,
          duration_minutes INT NOT NULL,
          location VARCHAR(255) NOT NULL,
          status ENUM('open', 'accepted', 'completed', 'cancelled') DEFAULT 'open',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (dog_id) REFERENCES Dogs(dog_id)
      )
    `);

    await db.execute(`
      CREATE TABLE WalkApplications (
          application_id INT AUTO_INCREMENT PRIMARY KEY,
          request_id INT NOT NULL,
          walker_id INT NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
          FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
          FOREIGN KEY (walker_id) REFERENCES Users(user_id),
          CONSTRAINT unique_application UNIQUE (request_id, walker_id)
      )
    `);

    await db.execute(`
      CREATE TABLE WalkRatings (
          rating_id INT AUTO_INCREMENT PRIMARY KEY,
          request_id INT NOT NULL,
          walker_id INT NOT NULL,
          owner_id INT NOT NULL,
          rating INT CHECK (rating BETWEEN 1 AND 5),
          comments TEXT,
          rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (request_id) REFERENCES WalkRequests(request_id),
          FOREIGN KEY (walker_id) REFERENCES Users(user_id),
          FOREIGN KEY (owner_id) REFERENCES Users(user_id),
          CONSTRAINT unique_rating_per_walk UNIQUE (request_id)
      )
    `);

    // Insert test data
    // Insert users (owners and walkers)
    await db.execute(`
      INSERT INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hash1', 'owner'),
      ('carol123', 'carol@example.com', 'hash2', 'owner'),
      ('bobwalker', 'bob@example.com', 'hash3', 'walker'),
      ('newwalker', 'new@example.com', 'hash4', 'walker')
    `);

    // Insert dogs
    await db.execute(`
      INSERT INTO Dogs (owner_id, name, size) VALUES
      (1, 'Max', 'medium'),
      (2, 'Bella', 'small'),
      (1, 'Charlie', 'large')
    `);

    // Insert walk requests
    await db.execute(`
      INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status) VALUES
      (1, '2025-06-10 08:00:00', 30, 'Parklands', 'open'),
      (2, '2025-06-11 09:00:00', 45, 'City Park', 'completed'),
      (3, '2025-06-12 10:00:00', 60, 'Beach Walk', 'completed')
    `);

    // Insert walk applications (for completed walks)
    await db.execute(`
      INSERT INTO WalkApplications (request_id, walker_id, status) VALUES
      (2, 3, 'accepted'),
      (3, 3, 'accepted')
    `);

    // Insert ratings for completed walks
    await db.execute(`
      INSERT INTO WalkRatings (request_id, walker_id, owner_id, rating, comments) VALUES
      (2, 3, 2, 4, 'Great walk!'),
      (3, 3, 1, 5, 'Excellent service!')
    `);

    console.log('Database setup complete with test data');
  } catch (err) {
    console.error('Error setting up database. Ensure MySQL is running: service mysql start', err);
  }
})();

// Route to get all dogs with their size and owner's username
app.get('/api/dogs', async (req, res) => {
  try {
    const [dogs] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
      ORDER BY d.name
    `);
    res.json(dogs);
  } catch (err) {
    console.error('Error fetching dogs:', err);
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

// Route to get all open walk requests with dog name, time, location, and owner username
app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [requests] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time,
             wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
      ORDER BY wr.requested_time
    `);
    res.json(requests);
  } catch (err) {
    console.error('Error fetching open walk requests:', err);
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

// Route to get walker summary with average rating and completed walks
app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [walkers] = await db.execute(`
      SELECT
        u.username AS walker_username,
        COUNT(wr.rating) AS total_ratings,
        CASE
          WHEN COUNT(wr.rating) > 0 THEN AVG(wr.rating)
          ELSE NULL
        END AS average_rating,
        COUNT(DISTINCT wa.request_id) AS completed_walks
      FROM Users u
      LEFT JOIN WalkApplications wa ON u.user_id = wa.walker_id AND wa.status = 'accepted'
      LEFT JOIN WalkRatings wr ON u.user_id = wr.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id, u.username
      ORDER BY u.username
    `);
    res.json(walkers);
  } catch (err) {
    console.error('Error fetching walker summary:', err);
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;