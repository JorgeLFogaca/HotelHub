
const pool = require('../database/connection');

async function createReservation(data) {
    const {
        guest_name,
        room_number,
        check_in,
        check_out
    } = data;

    const query = `
        INSERT INTO reservations
            (guest_name, room_number, check_in, check_out)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

    const values = [
        guest_name,
        room_number,
        check_in,
        check_out
    ];

    const result = await pool.query(query, values);

    return result.rows[0];
}

async function getAllReservations() {
    const result = await pool.query(
        'SELECT * FROM reservations ORDER BY id'
    );

    return result.rows;
}

async function getReservationById(id) {
    const result = await pool.query(
        'SELECT * FROM reservations WHERE id = $1',
        [id]
    );

    return result.rows[0] || null;
}

async function updateReservationStatus(id, status) {
    const query = `
        UPDATE reservations
        SET status = $1
        WHERE id = $2
        RETURNING *
    `;

    const result = await pool.query(query, [status, id]);

    return result.rows[0] || null;
}


async function checkAvailability(room_number, check_in, check_out) {
    const query = `
        SELECT EXISTS (
            SELECT 1
            FROM reservations
            WHERE room_number = $1
              AND status IN ('pending', 'confirmed')
              AND check_in < $3
              AND check_out > $2
        ) AS occupied
    `;

    const result = await pool.query(query, [
        room_number,
        check_in,
        check_out
    ]);

    console.log('Resultado PostgreSQL:', result.rows[0]);

    return !result.rows[0].occupied;
}


module.exports = {
    createReservation,
    getAllReservations,
    getReservationById,
    updateReservationStatus,
    checkAvailability
};