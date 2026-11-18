
const reservationService = require('../services/reservationService');
const { publishReservationCreated } = require('../messaging/reservationPublisher');

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


module.exports = {
    createReservation,
    getAllReservations,
    getReservationById, updateReservationStatus
};
