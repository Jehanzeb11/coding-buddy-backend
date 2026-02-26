const Chat = require("../Model/Chat");
const Message = require("../Model/Message");
const aiClient = require("../Utils/aiClient");
const { errorResponse, successResponse } = require("../Utils/responseErrorHandler");

const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;

        // 1. Concurrent check: Chat exists + Fetch the last messages
        const [chat, recentHistory] = await Promise.all([
            Chat.findByPk(chatId, { attributes: ['id', 'persona', 'title'] }),
            Message.findAll({
                where: { chatId },
                order: [["createdAt", "DESC"]],
                limit: 14, // We only need 14 from DB since we're adding the current user message
                attributes: ["role", "content"],
                raw: true
            })
        ]);

        if (!chat) {
            return errorResponse(res, 404, "NOT_FOUND", "Chat not found");
        }

        // 2. Add current message to the DB (non-blocking if not needed for history)
        // Wait for it because we need it in history? Actually, we can just add it manually in memory for AI call.
        const userMsgPromise = Message.create({ chatId, role: "user", content });

        // 3. Prepare AI payloads concurrently
        const historyForAI = [...recentHistory].reverse().map(msg => ({
            role: msg.role === "ai" ? "assistant" : "user",
            content: msg.content
        }));
        historyForAI.push({ role: "user", content });

        // 4. Call AI service with persistent client
        const aiResponsePromise = aiClient.post(
            `${process.env.AI_SERVICE_URL.replace(/\/$/, "")}/chat`,
            { messages: historyForAI, persona: chat.persona, stream: false }
        );

        const [userMsg, aiResponse] = await Promise.all([userMsgPromise, aiResponsePromise]);

        const aiContent = aiResponse.data.content;

        // 5. Save AI response and update title in parallel
        const finalActions = [
            Message.create({ chatId, role: "ai", content: aiContent })
        ];

        if (chat.title === "New Chat") {
            finalActions.push(chat.update({ title: content.substring(0, 40) }));
        }

        await Promise.all(finalActions);

        return successResponse(res, 201, { role: "ai", content: aiContent }, "Message sent successfully");

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
            order: [["createdAt", "ASC"]],
            attributes: ["id", "role", "content", "createdAt"], // only needed fields
            raw: true
        });
        return successResponse(res, 200, messages, "Messages fetched successfully");
    } catch (error) {
        return errorResponse(res, 500, "SERVER_ERROR", "Failed to fetch messages", null, error);
    }
}
// Keep rest of functions...
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
