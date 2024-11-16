const { Pool } = require('pg');

let env = process.env;

const pool = new Pool({
    user: env.POSTGRES_USER,
    host: 'localhost',
    database: env.DATABASE,
    password: env.POSTGRES_PDW,
    port: 5432
  });

exports.testConnection = async () => {
    try {
        const query = `SELECT "Id", "Email" FROM "Users" WHERE "Id" is not null`;
        const res = await pool.query(query);
        return res.rows; 
    } catch (e) {
        console.error('Error: ' + e);
        return [];
    }
}

module.exports = pool;