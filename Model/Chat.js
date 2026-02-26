const { Model, DataTypes } = require("sequelize");
const sequelize = require("../Config/db");

class Chat extends Model { }

Chat.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "New Chat",
        },
        persona: {
            type: DataTypes.ENUM("assistant", "reviewer", "debugger", "explainer"),
            allowNull: false,
            defaultValue: "assistant",
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
        modelName: "Chat",
        timestamps: true,
        indexes: [
            {
                fields: ["userId"]
            }
        ]
    }
);

module.exports = Chat;