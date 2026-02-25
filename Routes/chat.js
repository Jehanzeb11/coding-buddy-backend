const express = require("express");
const router = express.Router();

const { createChat, getChats, getChat, deleteChat, deleteAllUsersChat } = require("../Controllers/chatController");
const authMiddleware = require("../Middleware/authMiddleware");

router.post("/create-chat", authMiddleware, createChat);
router.get("/get-chats", authMiddleware, getChats);
router.get("/get-chat/:id", authMiddleware, getChat);
router.delete("/delete-chat/:id", authMiddleware, deleteChat);
router.delete("/delete-all-users-chat", authMiddleware, deleteAllUsersChat);

module.exports = router;