// ../Config/db.js
const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(
  process.env.DB_NAME || 'database_development',   // fallback if env missing
  process.env.DB_USER     || 'root',
  process.env.DB_PASSWORD || '',                       // '' = empty password (common in local dev)
  {
    host:     process.env.DB_HOST     || '127.0.0.1',  // use 127.0.0.1 over localhost on Windows sometimes
    port:     process.env.DB_PORT     || 3306,
    dialect:  'mysql',

    // Sequelize uses mysql2 internally — no need for dialectModule in most recent versions
    // If needed for explicit promise mode, add: dialectModule: require('mysql2')

    pool: {
      max:     10,
      min:     0,
      acquire: 30000,
      idle:    10000,
    },

    logging: false,  // ← change to console.log during debug
                     // or true/false depending on your needs
  }
);

// Optional but highly recommended: test connection on startup
(async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Sequelize connected to MySQL successfully');
  } catch (err) {
    console.error('❌ Sequelize connection failed:', err.message || err);
    // Optionally: process.exit(1);  // stop app if DB fails
  }
})();

module.exports = sequelize;