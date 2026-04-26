const axios = require("axios");
const http = require("http");
const https = require("https");

// Create a persistent axios instance with connection pooling
const aiClient = axios.create({
    httpAgent: new http.Agent({ keepAlive: true, maxSockets: 100 }),
    httpsAgent: new https.Agent({ keepAlive: true, maxSockets: 100 }),
    timeout: 60000, // per-request override can adjust this for AI latency
    headers: {
        'Content-Type': 'application/json'
    }
});

module.exports = aiClient;
