
const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

const amqp = require('amqplib');

async function startConsumer() {
    try {
        const connection = await amqp.connect({
            protocol: 'amqp',
            hostname: process.env.RABBITMQ_HOST,
            port: Number(process.env.RABBITMQ_PORT),
            username: process.env.RABBITMQ_USER,
            password: process.env.RABBITMQ_PASSWORD
        });

        const channel = await connection.createChannel();

        await channel.assertExchange('hotelhub.events', 'topic', {
            durable: true
        });

        await channel.assertQueue('audit.reservations', {
            durable: true
        });

        await channel.bindQueue(
            'audit.reservations',
            'hotelhub.events',
            'reservation.*'
        );

        await channel.prefetch(1);

        console.log('Audit Service conectado ao RabbitMQ');
        console.log('Aguardando eventos de reservas...');

        await channel.consume(
            'audit.reservations',
            (message) => {
                if (!message) return;

                try {
                    const event = JSON.parse(
                        message.content.toString()
                    );

                    console.log('Evento recebido:', event);

                    channel.ack(message);

                } catch (error) {
                    console.error(
                        'Erro ao processar evento:',
                        error.message
                    );

                    channel.nack(message, false, false);
                }
            },
            { noAck: false }
        );

    } catch (error) {
        console.error('Erro no Audit Service:', error.message);
        process.exit(1);
    }
}

startConsumer();
