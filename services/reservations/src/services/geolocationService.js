
const HOTEL_LOCATION = {
    latitude: -28.638,
    longitude: -53.606
};

// Distância máxima permitida para check-in (metros)
const MAX_DISTANCE_METERS = 200;

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371000;

    const toRadians = degrees => degrees * Math.PI / 180;

    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRadians(lat1)) *
        Math.cos(toRadians(lat2)) *
        Math.sin(dLon / 2) ** 2;

    const c = 2 * Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
    );

    return R * c;
}

function validateLocation(latitude, longitude) {
    if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        latitude < -90 ||
        latitude > 90 ||
        longitude < -180 ||
        longitude > 180
    ) {
        return {
            allowed: false,
            reason: 'Coordenadas inválidas'
        };
    }

    const distance = calculateDistance(
        latitude,
        longitude,
        HOTEL_LOCATION.latitude,
        HOTEL_LOCATION.longitude
    );

    return {
        allowed: distance <= MAX_DISTANCE_METERS,
        distance: Math.round(distance)
    };
}

module.exports = {
    validateLocation
};
