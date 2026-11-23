
const reservationService = require('../services/reservationService');
const { publishReservationCreated } = require('../messaging/reservationPublisher');
const { performCheckin } = require('../services/checkinService');
const {
    generateDigitalKey,
    validateDigitalKey
} = require('../services/digitalKeyService');

async function createReservation(req, res) {
    try {
        const {
            guest_name,
            room_number,
            check_in,
            check_out
        } = req.body;

        if (
            typeof guest_name !== 'string' ||
            !guest_name.trim() ||
            !Number.isInteger(room_number) ||
            room_number <= 0 ||
            !check_in ||
            !check_out
        ) {
            return res.status(400).json({
                error: 'Dados da reserva inválidos'
            });
        }


        const start = new Date(`${check_in}T00:00:00Z`);
        const end = new Date(`${check_out}T00:00:00Z`);

        if (
            !/^\d{4}-\d{2}-\d{2}$/.test(check_in) ||
            !/^\d{4}-\d{2}-\d{2}$/.test(check_out) ||
            Number.isNaN(start.getTime()) ||
            Number.isNaN(end.getTime()) ||
            start.toISOString().slice(0, 10) !== check_in ||
            end.toISOString().slice(0, 10) !== check_out ||
            end <= start
        ) {
            return res.status(400).json({
                error: 'Período da reserva inválido'
            });
        }

        const available = await reservationService.checkAvailability(
            room_number,
            check_in,
            check_out
        );

        if (!available) {
            return res.status(409).json({
                error: 'Quarto indisponível para o período solicitado'
            });
        }


        const reservation = await reservationService.createReservation({
            guest_name: guest_name.trim(),
            room_number,
            check_in,
            check_out
        });

        await publishReservationCreated(reservation);

        return res.status(201).json(reservation);


    } catch (error) {

        if (error.code === '23P01') {
            return res.status(409).json({
                error: 'Quarto indisponível para o período solicitado'
            });
        }

        console.error('Erro ao criar reserva:', error.message);

        return res.status(500).json({
            error: 'Não foi possível criar a reserva'
        });
    }

}


async function getAllReservations(req, res) {
    try {
        const reservations =
            await reservationService.getAllReservations();

        return res.status(200).json(reservations);

    } catch (error) {
        console.error('Erro ao listar reservas:', error.message);

        return res.status(500).json({
            error: 'Erro ao consultar reservas'
        });
    }
}

async function getReservationById(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID inválido'
            });
        }

        const reservation =
            await reservationService.getReservationById(id);

        if (!reservation) {
            return res.status(404).json({
                error: 'Reserva não encontrada'
            });
        }

        return res.status(200).json(reservation);

    } catch (error) {
        console.error('Erro ao consultar reserva:', error.message);

        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
}

async function updateReservationStatus(req, res) {
    try {
        const id = Number(req.params.id);
        const { status } = req.body;

        if (!Number.isSafeInteger(id) || id <= 0) {
            return res.status(400).json({
                error: 'ID inválido'
            });
        }

        const validStatuses = [
            'pending',
            'confirmed',
            'cancelled',
            'completed'
        ];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                error: 'Status inválido'
            });
        }

        const reservation =
            await reservationService.updateReservationStatus(
                id,
                status
            );

        if (!reservation) {
            return res.status(404).json({
                error: 'Reserva não encontrada'
            });
        }

        return res.status(200).json(reservation);

    } catch (error) {
        console.error('Erro ao atualizar reserva:', error.message);

        return res.status(500).json({
            error: 'Erro interno do servidor'
        });
    }
}

async function checkin(req, res) {
    try {
        const reservationId = Number(req.params.id);
        const { latitude, longitude, accuracy } = req.body;

        if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
            return res.status(400).json({
                error: 'ID da reserva inválido'
            });
        }

        if (
            typeof latitude !== 'number' ||
            typeof longitude !== 'number' ||
            !Number.isFinite(latitude) ||
            !Number.isFinite(longitude) ||
            (accuracy !== undefined &&
                (typeof accuracy !== 'number' ||
                    !Number.isFinite(accuracy) ||
                    accuracy < 0))
        ) {
            return res.status(400).json({
                error: 'Dados de localização inválidos'
            });
        }

        const result = await performCheckin(
            reservationId,
            latitude,
            longitude,
            accuracy
        );

        return res.status(201).json({
            message: 'Check-in realizado com sucesso',
            ...result
        });

    } catch (error) {
        console.error('Erro no check-in:', error.message);

        return res.status(error.status || 500).json({
            error: error.status
                ? error.message
                : 'Erro interno ao realizar check-in'
        });
    }
}


async function createDigitalKey(req, res) {
    try {
        const reservationId = Number(req.params.id);

        if (!Number.isSafeInteger(reservationId) || reservationId <= 0) {
            return res.status(400).json({
                error: 'ID da reserva inválido'
            });
        }

        const result = await generateDigitalKey(reservationId);

        res.set('Cache-Control', 'no-store');

        return res.status(201).json({
            message: 'Chave digital gerada com sucesso',
            ...result
        });

    } catch (error) {
        console.error('Erro ao gerar chave:', error.message);

        return res.status(error.status || 500).json({
            error: error.status
                ? error.message
                : 'Erro interno ao gerar chave digital'
        });
    }
}

async function verifyDigitalKey(req, res) {
    try {
        const { key } = req.body;

        if (typeof key !== 'string' || !/^[a-f0-9]{64}$/i.test(key)) {
            return res.status(400).json({
                error: 'Formato de chave inválido'
            });
        }

        const result = await validateDigitalKey(key);

        return res.status(200).json(result);

    } catch (error) {
        console.error('Erro ao validar chave:', error.message);

        return res.status(500).json({
            error: 'Erro interno ao validar chave digital'
        });
    }
}


module.exports = {
    createReservation,
    getAllReservations,
    getReservationById, 
    updateReservationStatus, 
    checkin,
    createDigitalKey,
    verifyDigitalKey
};
