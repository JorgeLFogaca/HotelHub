
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Carrega o .env da raiz do microsserviço Reservations
dotenv.config({
    path: path.resolve(__dirname, '../../.env')
});

// Verifica se as variáveis foram carregadas
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_PORT:', process.env.DB_PORT);
console.log('DB_USER:', process.env.DB_USER);
console.log('DB_PASSWORD tipo:', typeof process.env.DB_PASSWORD);
console.log('DB_PASSWORD definida:', Boolean(process.env.DB_PASSWORD));

const pool = new Pool({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

module.exports = pool;
