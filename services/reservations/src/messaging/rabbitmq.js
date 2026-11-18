
const amqp = require('amqplib');

let connection;
let channel;

async function connectRabbitMQ() {
    connection = await amqp.connect(process.env.RABBITMQ_URL);

    channel = await connection.createConfirmChannel();

    await channel.assertExchange('hotelhub.events', 'topic', {
        durable: true
    });

    console.log('RabbitMQ conectado com sucesso!');
}

function getChannel() {
    if (!channel) {
        throw new Error('RabbitMQ não está conectado');
    }

    return channel;
}

module.exports = {
    connectRabbitMQ,
    getChannel
};
