const { prototype } = require('events');
const express = require ('express');
const mysql = require ('mysql2/promise');
const app = express();
app.use (express.json());

let db;

async function initDB() {
  db = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'DogWalkService'
  });
try {
  await db.execute(`I`)
}

}
app.get('/api/dogs', async (req, res) => {
 try{
  const [rows] = await db.execute(`
    Select d.name AS dog_name, d.size, u.username AS owner_username
    FROM Dogs d
    JOIN Users u ON d.owner_id = u.user_id`);
    res.json(rows);
 } catch (err){
    res.status(500).json({error: 'Failed to fetch dogs', details: err.message});
 }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try{
   const [rows] = await db.execute(`
     Select wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
     FROM WalkRequests wr
     JOIN Dogs d ON wr.dog_id = d.dog_id
     JOIN Users u ON d.owner_id = u.user_id
     WHERE wr.status = 'open'`);
     res.json(rows);
  } catch (err){
     res.status(500).json({error: 'Failed to fetch walk requests', details: err.message});
  }
 });

 app.get('/api/walkrequests/open', async (req, res) => {
  try{
   const [rows] = await db.execute(`
     Select wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
     FROM WalkRequests wr
     JOIN Dogs d ON wr.dog_id = d.dog_id
     JOIN Users u ON d.owner_id = u.user_id
     WHERE wr.status = 'open'`);
     res.json(rows);
  } catch (err){
     res.status(500).json({error: 'Failed to fetch walk requests', details: err.message});
  }
 });

 app.get('/api/walkers/summary', async (req, res) => {
  try{
   const [rows] = await db.execute(`
    SELECT
    u.username AS walker_username,
    COUNT(r.rating_id) AS total_ratings,
    ROUND(AVG(r.rating), 1) AS average_rating,
    (
      SELECT COUNT(*) FROM WalkRequests wr
      JOIN WalkApplications wa ON wr.request_id = wa.request_id
      WHERE wa.walker_id = u.user_id AND wr.status = 'completed' AND wa.status = 'accepted'
    ) AS completed_walks
    FROM Users u
    LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
    WHERE u.role = 'walker'
    GROUP BY u.user_id
    `);
     res.json(rows);
  } catch (err){
     res.status(500).json({error: 'Failed to fetch walkers requests', details: err.message});
  }
 });

 initDB().then(() => {
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
 });
