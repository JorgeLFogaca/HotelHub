
const pool = require('../database/connection');
const { validateLocation } = require('./geolocationService');

async function performCheckin(reservationId, latitude, longitude, accuracy) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `SELECT id, status, check_in, check_out
             FROM reservations
             WHERE id = $1
             FOR UPDATE`,
            [reservationId]
        );

        if (result.rows.length === 0) {
            const error = new Error('Reserva não encontrada');
            error.status = 404;
            throw error;
        }

        const reservation = result.rows[0];

        if (reservation.status !== 'confirmed') {
            const error = new Error('Reserva não está confirmada');
            error.status = 409;
            throw error;
        }

        const period = await client.query(
            `SELECT
                CURRENT_DATE >= $1::date
                AND CURRENT_DATE < $2::date AS valid`,
            [reservation.check_in, reservation.check_out]
        );

        if (!period.rows[0].valid) {
            const error = new Error(
                'Fora do período permitido para check-in'
            );
            error.status = 409;
            throw error;
        }

        const location = validateLocation(latitude, longitude);

        if (!location.allowed) {
            const error = new Error(
                location.reason || 'Fora da área permitida para check-in'
            );
            error.status = 403;
            throw error;
        }

        const checkin = await client.query(
            `INSERT INTO reservation_checkins
                (reservation_id, latitude, longitude, location_accuracy)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [reservationId, latitude, longitude, accuracy ?? null]
        );

        await client.query('COMMIT');

        return {
            checkin: checkin.rows[0],
            distance: location.distance
        };

    } catch (error) {
        await client.query('ROLLBACK');

        if (error.code === '23505') {
            error.status = 409;
            error.message = 'Check-in já realizado para esta reserva';
        }

        throw error;

    } finally {
        client.release();
    }
}

module.exports = {
    performCheckin
};
