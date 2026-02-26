const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const app = express();

// Security and Performance Middlewares
app.use(helmet()); // Basic security headers
app.use(compression()); // Compress all responses
app.use(cors());
app.use(express.json({ limit: '10mb' })); // Limit body size for safety

// ADD THESE TWO LINES
require('./Model/associations');
const sequelize = require('./Config/db');

// Debug logger - ONLY IN DEV
if (process.env.NODE_ENV !== 'production') {
    app.use((req, res, next) => {
        console.log(`DEBUG: ${req.method} ${req.url}`);
        next();
    });
}


// Handle JSON parsing errors
app.use((err, req, res, next) => {
    if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
        return res.status(400).json({
            error: {
                code: "BAD_REQUEST",
                message: "Invalid JSON payload"
            }
        });
    }
    next();
});

const userRouter = require('./Routes/user');
const chatRouter = require('./Routes/chat');
const messageRouter = require('./Routes/message');
const port = process.env.PORT || 3000;

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

app.use('/api', userRouter);
app.use('/api/chat', chatRouter);
app.use('/api/message', messageRouter);
// ADD THIS BEFORE app.listen
sequelize.sync({ alter: false })
    .then(() => {
        console.log('✅ DB synced')  // add this line
        app.listen(port, () => {
            console.log(`🚀 Server running on http://localhost:${port}`);
        });
    })
    .catch(err => {
        console.error('❌ DB sync failed:', err.message);
        process.exit(1);
    });