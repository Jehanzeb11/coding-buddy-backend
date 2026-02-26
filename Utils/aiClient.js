const axios = require("axios");
const http = require("http");
const https = require("https");

// Create a persistent axios instance with connection pooling
const aiClient = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100 }),
    timeout: 30000, // 30 seconds
    headers: {
        'Content-Type': 'application/json'
    }
});

module.exports = aiClient;
