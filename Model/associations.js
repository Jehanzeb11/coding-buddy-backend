const User = require("./User");
const Chat = require("./Chat");
const Message = require("./Message");

// User <-> Chat
User.hasMany(Chat, { foreignKey: "userId", onDelete: "CASCADE" });
Chat.belongsTo(User, { foreignKey: "userId" });

// Chat <-> Message
Chat.hasMany(Message, { foreignKey: "chatId", onDelete: "CASCADE" });
Message.belongsTo(Chat, { foreignKey: "chatId" });

module.exports = { User, Chat, Message };