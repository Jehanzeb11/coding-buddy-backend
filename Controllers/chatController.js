const { Chat } = require("../Model/associations");

const createChat = async (req, res) => {
    try {
        const { title, persona } = req.body;

        if (!title || !persona) {
            return res.status(400).json({ message: "Title and persona are required" });
        }

        const chat = await Chat.create({ userId: req.user.id, title, persona });
        // Return only necessary data
        res.status(201).json({ chat: chat.get({ plain: true }), message: "Chat created successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getChats = async (req, res) => {
    try {
        const chats = await Chat.findAll({
            where: { userId: req.user.id },
            order: [["createdAt", "DESC"]],
            attributes: ["id", "title", "persona", "createdAt"], // only fetch what we need
            raw: true
        });
        res.status(200).json({ chats, message: "Chats fetched successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const getChat = async (req, res) => {
    try {
        const chat = await Chat.findOne({
            where: { id: req.params.id, userId: req.user.id },
            attributes: ["id", "title", "persona", "createdAt"],
            raw: true
        });
        if (!chat) {
            return res.status(404).json({ message: "Chat not found" });
        }
        res.status(200).json({ chat, message: "Chat fetched successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteChat = async (req, res) => {
    try {
        const result = await Chat.destroy({ where: { id: req.params.id, userId: req.user.id } });
        if (result === 0) {
            return res.status(404).json({ message: "Chat not found" });
        }
        res.status(200).json({ message: "Chat deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

const deleteAllUsersChat = async (req, res) => {
    try {
        // Fix: Chat.destroy with where clause instead of trying to destroy an array
        await Chat.destroy({ where: { userId: req.user.id } });
        res.status(200).json({ message: "All chats deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
}

module.exports = { createChat, getChats, getChat, deleteChat, deleteAllUsersChat };
