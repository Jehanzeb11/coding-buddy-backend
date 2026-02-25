const axios = require("axios");
const Chat = require("../Model/Chat");
const Message = require("../Model/Message");
const { errorResponse, successResponse } = require("../Utils/responseErrorHandler");

const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;

        // 1. check chat exists
        const chat = await Chat.findByPk(chatId);
        if (!chat) {
            return errorResponse(res, 404, "NOT_FOUND", "Chat not found");
        }

        // 2. save user message to DB
        await Message.create({ chatId, role: "user", content });

        // 3. load full conversation history
        const history = await Message.findAll({
            where: { chatId },
            order: [["createdAt", "ASC"]]
        });

        // 4. format history for Python service
        const messages = history.map(msg => ({
            role: msg.role === "ai" ? "assistant" : "user",
            content: msg.content
        }));

        // 5. call Python AI service and stream response
        const aiResponse = await axios.post(
            `${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/chat`,
            { messages, persona: chat.persona },
            { responseType: "stream" }
        );

        // 6. stream response back to frontend
        res.setHeader("Content-Type", "text/plain");
        res.setHeader("Transfer-Encoding", "chunked");

        let fullResponse = "";

        aiResponse.data.on("data", (chunk) => {
            const token = chunk.toString();
            fullResponse += token;
            res.write(token);
        });

        aiResponse.data.on("end", async () => {
            // 7. save complete AI response to DB
            await Message.create({ chatId, role: "ai", content: fullResponse });

            // 8. update chat title from first message if still default
            if (chat.title === "New Chat") {
                await chat.update({
                    title: content.substring(0, 40)
                });
            }

            res.end();
        });

        aiResponse.data.on("error", (err) => {
            console.error("[sendMessage stream error]", err);
            res.end();
        });

    } catch (error) {
        console.error("[sendMessage]", error);
        return errorResponse(res, 500, "SERVER_ERROR", "Failed to send message", null, error);
    }
}

const getMessages = async (req, res) => {
    try {
        const { chatId } = req.params;
        const messages = await Message.findAll({
            where: { chatId },
            order: [["createdAt", "ASC"]]
        });
        return successResponse(res, 200, messages, "Messages fetched successfully");
    } catch (error) {
        return errorResponse(res, 500, "SERVER_ERROR", "Failed to fetch messages", null, error);
    }
}

const deleteMessage = async (req, res) => {
    try {
        const message = await Message.findByPk(req.params.id);
        if (!message) {
            return errorResponse(res, 404, "NOT_FOUND", "Message not found");
        }
        await message.destroy();
        return successResponse(res, 200, null, "Message deleted successfully");
    } catch (error) {
        return errorResponse(res, 500, "SERVER_ERROR", "Failed to delete message", null, error);
    }
}

const deleteAllMessages = async (req, res) => {
    try {
        await Message.destroy({ where: { chatId: req.params.chatId } });
        return successResponse(res, 200, null, "All messages deleted successfully");
    } catch (error) {
        return errorResponse(res, 500, "SERVER_ERROR", "Failed to delete messages", null, error);
    }
}

module.exports = { sendMessage, getMessages, deleteMessage, deleteAllMessages };
