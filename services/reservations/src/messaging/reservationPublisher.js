
const { getChannel } = require('./rabbitmq');

async function publishReservationCreated(reservation) {
    const channel = getChannel();

    const event = {
        event: 'reservation.created',
        reservationId: reservation.id,
        roomNumber: reservation.room_number,
        guestName: reservation.guest_name,
        checkIn: reservation.check_in,
        checkOut: reservation.check_out,
        status: reservation.status,
        timestamp: new Date().toISOString()
    };

    channel.publish(
        'hotelhub.events',
        'reservation.created',
        Buffer.from(JSON.stringify(event)),
        {
            persistent: true,
            contentType: 'application/json'
        }
    );

    await channel.waitForConfirms();

    // console.log('Evento publicado:', event.event);
}

module.exports = { publishReservationCreated };
