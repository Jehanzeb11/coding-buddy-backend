const Chat = require("../Model/Chat");
const Message = require("../Model/Message");
const aiClient = require("../Utils/aiClient");
const { errorResponse, successResponse } = require("../Utils/responseErrorHandler");

const getAiTimeoutMs = () => {
    const fallbackMs = 60000;
    const parsed = Number(process.env.AI_TIMEOUT_MS);
    if (!Number.isFinite(parsed) || parsed < 5000) {
        return fallbackMs;
    }
    return Math.floor(parsed);
};

const normalizeAiContent = (aiResponseData) => {
    if (!aiResponseData) return null;
    if (typeof aiResponseData.content === "string" && aiResponseData.content.trim()) {
        return aiResponseData.content.trim();
    }
    if (typeof aiResponseData.message === "string" && aiResponseData.message.trim()) {
        return aiResponseData.message.trim();
    }
    if (
        Array.isArray(aiResponseData.choices) &&
        aiResponseData.choices[0] &&
        aiResponseData.choices[0].message &&
        typeof aiResponseData.choices[0].message.content === "string" &&
        aiResponseData.choices[0].message.content.trim()
    ) {
        return aiResponseData.choices[0].message.content.trim();
    }
    return null;
};

const sendMessage = async (req, res) => {
    try {
        const { chatId } = req.params;
        const { content } = req.body;
        const aiServiceUrl = process.env.AI_SERVICE_URL;
        const aiTimeoutMs = getAiTimeoutMs();
        const normalizedContent = typeof content === "string" ? content.trim() : "";

        if (!normalizedContent) {
            return errorResponse(
                res,
                400,
                "VALIDATION_ERROR",
                "content is required and must be a non-empty string",
            );
        }

        if (normalizedContent.length > 10000) {
            return errorResponse(
                res,
                400,
                "VALIDATION_ERROR",
                "content must not exceed 10000 characters",
            );
        }

        if (!aiServiceUrl) {
            return errorResponse(
                res,
                500,
                "CONFIG_ERROR",
                "AI_SERVICE_URL is not configured",
            );
        }

        // 1. Concurrent check: Chat exists + Fetch the last messages
        const [chat, recentHistory] = await Promise.all([
            Chat.findOne({
                where: { id: chatId, userId: req.user.id },
                attributes: ['id', 'persona', 'title']
            }),
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
        const userMsgPromise = Message.create({ chatId, role: "user", content: normalizedContent });

        // 3. Prepare AI payloads concurrently
        const historyForAI = [...recentHistory].reverse().map(msg => ({
            role: msg.role === "ai" ? "assistant" : "user",
            content: msg.content
        }));
        historyForAI.push({ role: "user", content: normalizedContent });

        // 4. Call AI service with persistent client
        const aiResponsePromise = aiClient.post(
            `${aiServiceUrl.replace(/\/$/, "")}/chat`,
            { messages: historyForAI, persona: chat.persona, stream: false },
            { timeout: aiTimeoutMs }
        );

        const [, aiResponse] = await Promise.all([userMsgPromise, aiResponsePromise]);

        const aiContent = normalizeAiContent(aiResponse.data);
        if (!aiContent) {
            return errorResponse(
                res,
                502,
                "BAD_GATEWAY",
                "AI service returned an invalid response payload",
            );
        }

        // 5. Save AI response and update title in parallel
        const finalActions = [
            Message.create({ chatId, role: "ai", content: aiContent })
        ];

        if (chat.title === "New Chat") {
            finalActions.push(chat.update({ title: normalizedContent.substring(0, 40) }));
        }

        await Promise.all(finalActions);

        return successResponse(res, 201, { role: "ai", content: aiContent }, "Message sent successfully");

    } catch (error) {
        console.error("[sendMessage]", error);
        if (error?.code === "ECONNABORTED") {
            return errorResponse(
                res,
                504,
                "AI_TIMEOUT",
                `AI service timed out after ${getAiTimeoutMs()}ms. Please try again in a moment.`,
            );
        }

        if (error?.code === "ECONNREFUSED" || error?.code === "ENOTFOUND") {
            return errorResponse(
                res,
                502,
                "AI_UNAVAILABLE",
                "AI service is unavailable. Please verify AI_SERVICE_URL and service health.",
            );
        }

        if (error?.response?.status) {
            return errorResponse(
                res,
                502,
                "AI_SERVICE_ERROR",
                "AI service returned an error",
                { status: error.response.status },
            );
        }

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
