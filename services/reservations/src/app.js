
require('dotenv').config();

const express = require('express');
const pool = require('./database/connection');

const app = express();

app.use(express.json());

app.get('/health', (req, res) => {
    res.json({
        service: 'reservations',
        status: 'online'
    });
});

app.get('/db-test', async (req, res) => {
    try {
        const result = await pool.query('SELECT NOW()');

        res.json({
            database: 'PostgreSQL',
            status: 'connected',
            serverTime: result.rows[0].now
        });

    } catch (error) {
        console.error('Erro no PostgreSQL:', error.message);

        res.status(500).json({
            database: 'PostgreSQL',
            status: 'error'
        });
    }
});

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
    console.log(`Reservations rodando na porta ${PORT}`);
});
