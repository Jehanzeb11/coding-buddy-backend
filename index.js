const dotenv = require('dotenv');
dotenv.config();
const express = require('express');
const cors = require('cors');
const app = express();
app.use(cors());

// Debug logger - MUST BE FIRST to see what's happening
app.use((req, res, next) => {
    console.log(`DEBUG: ${req.method} ${req.url}`);
    next();
});

app.use(express.json());

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
const port = process.env.PORT || 3000;

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.use('/api', userRouter);

app.listen(port, () => {
    console.log(`🚀 Server version 2.0 running on http://localhost:${port}`);
});