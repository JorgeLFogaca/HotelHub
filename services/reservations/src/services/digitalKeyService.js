
const crypto = require('crypto');
const pool = require('../database/connection');

function hashKey(key) {
    return crypto
        .createHash('sha256')
        .update(key)
        .digest('hex');
}

async function generateDigitalKey(reservationId) {
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        const result = await client.query(
            `SELECT r.id, r.status, r.check_out,
                    c.id AS checkin_id
             FROM reservations r
             LEFT JOIN reservation_checkins c
                ON c.reservation_id = r.id
             WHERE r.id = $1
             FOR UPDATE OF r`,
            [reservationId]
        );

        if (result.rows.length === 0) {
            const error = new Error('Reserva não encontrada');
            error.status = 404;
            throw error;
        }

        const reservation = result.rows[0];

        if (
            reservation.status !== 'confirmed' ||
            !reservation.checkin_id
        ) {
            const error = new Error(
                'É necessário realizar o check-in em uma reserva confirmada'
            );
            error.status = 409;
            throw error;
        }

        const key = crypto.randomBytes(32).toString('hex');
        const keyHash = hashKey(key);

        const inserted = await client.query(
            `INSERT INTO digital_keys
                (reservation_id, key_hash, expires_at)
             VALUES (
                $1,
                $2,
                ($3::date::timestamp AT TIME ZONE 'America/Sao_Paulo')
             )
             ON CONFLICT (reservation_id) DO NOTHING
             RETURNING expires_at`,
            [reservationId, keyHash, reservation.check_out]
        );

        if (inserted.rows.length === 0) {
            const error = new Error(
                'Já existe uma chave digital para esta reserva'
            );
            error.status = 409;
            throw error;
        }

        await client.query('COMMIT');

        return {
            key,
            expiresAt: inserted.rows[0].expires_at
        };

    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
}

async function validateDigitalKey(key) {
    if (typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key)) {
        return { valid: false };
    }

    const result = await pool.query(
        `SELECT k.reservation_id, r.room_number
         FROM digital_keys k
         JOIN reservations r ON r.id = k.reservation_id
         WHERE k.key_hash = $1
           AND k.revoked_at IS NULL
           AND k.expires_at > NOW()
           AND r.status = 'confirmed'
           AND EXISTS (
               SELECT 1
               FROM reservation_checkins c
               WHERE c.reservation_id = r.id
           )`,
        [hashKey(key)]
    );

    if (result.rows.length === 0) {
        return { valid: false };
    }

    return {
        valid: true,
        reservationId: result.rows[0].reservation_id,
        roomNumber: result.rows[0].room_number
    };
}

module.exports = {
    generateDigitalKey,
    validateDigitalKey
};
