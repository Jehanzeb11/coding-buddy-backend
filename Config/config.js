require('dotenv').config();
   // ← this makes process.env work

module.exports = {
  development: {
    username: process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',      // '' = empty password if not set
    database: process.env.DB_NAME || 'database_development',
    host:     process.env.DB_HOST     || '127.0.0.1',
    port:     process.env.DB_PORT     || 3306,
    dialect:  'mysql',
    logging:  false,   // change to console.log if you want to debug queries
  },
  test: {
    username: process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'database_test',
    host:     process.env.DB_HOST || '127.0.0.1',
    dialect:  'mysql'
  },
  production: {
    username: process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'database_production',
    host:     process.env.DB_HOST     || '127.0.0.1',
    dialect:  'mysql'
  }
};