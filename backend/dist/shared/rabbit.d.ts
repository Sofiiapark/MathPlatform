import amqp from "amqplib";
export declare function connectRabbit(): Promise<{
    connection: amqp.ChannelModel;
    channel: amqp.Channel;
}>;
//# sourceMappingURL=rabbit.d.ts.map