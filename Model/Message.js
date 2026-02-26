const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/db");

class Message extends Model { }

Message.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        chatId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        role: {
            type: DataTypes.ENUM("user", "ai"),
            allowNull: false,
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        createdAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
        updatedAt: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW,
        },
    },
    {
        sequelize,
        modelName: "Message",
        timestamps: true,
        indexes: [
            {
                fields: ["chatId"]
            },
            {
                fields: ["createdAt"]
            }
        ]
    }
);

module.exports = Message;