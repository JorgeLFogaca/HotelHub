const { io } = require('socket.io-client');

const socket = io('http://localhost:3002');

socket.on('connect', () => {
    console.log('Conectado ao Live Service!');
    console.log('Socket ID:', socket.id);
});

socket.on('reservationEvent', (event) => {
    console.log('\nEvento recebido via WebSocket:');
    console.log(JSON.stringify(event, null, 2));
});

socket.on('connect_error', (error) => {
    console.error('Erro de conexão:', error.message);
});

socket.on('disconnect', () => {
    console.log('Desconectado do Live Service');
});