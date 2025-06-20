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

}
app.get('/api/dogs', async (req, res) => {
 try{
  const [rows] = await db.execute(`
    Select d.name AS dog_name, d.size, u.username AS owner_username
    FROM Dogs d`)
 }
});