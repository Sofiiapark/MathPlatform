"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectRabbit = connectRabbit;
const amqplib_1 = __importDefault(require("amqplib"));
async function connectRabbit() {
    const connection = await amqplib_1.default.connect("amqp://rabbitmq");
    const channel = await connection.createChannel();
    return { connection, channel };
}
//# sourceMappingURL=rabbit.js.map