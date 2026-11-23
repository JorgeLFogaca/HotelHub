const path = require('path');

require('dotenv').config({
    path: path.resolve(__dirname, '../.env')
});

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const amqp = require('amqplib');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: '*'
    }
});

const PORT = Number(process.env.PORT) || 3002;

app.get('/health', (req, res) => {
    res.json({
        service: 'live',
        status: 'online'
    });
});

io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);

    socket.on('disconnect', () => {
        console.log('Cliente desconectado:', socket.id);
    });
});

async function connectRabbitMQ() {
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

    await channel.assertQueue('live.reservations', {
        durable: true
    });

    await channel.bindQueue(
        'live.reservations',
        'hotelhub.events',
        'reservation.*'
    );

    await channel.prefetch(1);

    await channel.consume(
        'live.reservations',
        (message) => {
            if (!message) return;

            try {
                const event = JSON.parse(
                    message.content.toString()
                );

                console.log('Evento recebido:', event.event);

                io.emit('reservationEvent', event);

                console.log('Evento enviado via WebSocket');

                channel.ack(message);

            } catch (error) {
                console.error('Erro ao processar evento:', error.message);
                channel.nack(message, false, false);
            }
        },
        { noAck: false }
    );

    console.log('Live Service conectado ao RabbitMQ');
}

async function start() {
    try {
        await connectRabbitMQ();

        server.listen(PORT, () => {
            console.log(`Live Service rodando na porta ${PORT}`);
        });
    } catch (error) {
        console.error('Erro ao iniciar Live Service:', error.message);
        process.exit(1);
    }
}

start();