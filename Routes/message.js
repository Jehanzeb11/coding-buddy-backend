const express = require("express");
const router = express.Router();
const { sendMessage, getMessages, deleteMessage, deleteAllMessages } = require("../Controllers/messageController");
const authMiddleware = require("../Middleware/authMiddleware");

router.post("/send-message/:chatId", authMiddleware, sendMessage);
router.get("/get-messages/:chatId", authMiddleware, getMessages);
router.delete("/delete-message/:id", authMiddleware, deleteMessage);
router.delete("/delete-all-messages/:chatId", authMiddleware, deleteAllMessages);

module.exports = router;