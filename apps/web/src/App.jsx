
import { useEffect, useState } from 'react';
import {
    BedDouble,
    CalendarDays,
    CheckCircle,
    Clock
} from 'lucide-react';

import ReservationForm from './components/reservationForm';
import api from './services/api';
import socket from './services/socket';

import './App.css';

function App() {
    const [reservas, setReservas] = useState([]);
    const [erro, setErro] = useState('');
    const [carregando, setCarregando] = useState(true);
    const [wsConectado, setWsConectado] = useState(false);

    // Buscar reservas no backend
    async function carregarReservas() {
        try {
            const response = await api.get('/reservations');

            setReservas(response.data);
            setErro('');

        } catch (error) {
            console.error('Erro ao buscar reservas:', error);
            setErro('Não foi possível carregar as reservas.');

        } finally {
            setCarregando(false);
        }
    }

    // Carregar reservas e conectar ao WebSocket
    useEffect(() => {
        carregarReservas();

        function conectar() {
            console.log('WebSocket conectado:', socket.id);
            setWsConectado(true);

            // Sincronizar após uma reconexão
            carregarReservas();
        }

        function desconectar(motivo) {
            console.log('WebSocket desconectado:', motivo);
            setWsConectado(false);
        }

        function erroConexao(error) {
            console.error(
                'Erro na conexão WebSocket:',
                error.message
            );

            setWsConectado(false);
        }

        function receberEvento(event) {
            console.log(
                'Evento recebido via WebSocket:',
                event
            );

            if (event.event?.startsWith('reservation.')) {
                carregarReservas();
            }
        }

        socket.on('connect', conectar);
        socket.on('disconnect', desconectar);
        socket.on('connect_error', erroConexao);
        socket.on('reservationEvent', receberEvento);

        socket.connect();

        return () => {
            socket.off('connect', conectar);
            socket.off('disconnect', desconectar);
            socket.off('connect_error', erroConexao);
            socket.off('reservationEvent', receberEvento);

            socket.disconnect();
        };
    }, []);

    // Indicadores do Dashboard
    const confirmadas = reservas.filter(
        reserva => reserva.status === 'confirmed'
    ).length;

    const pendentes = reservas.filter(
        reserva => reserva.status === 'pending'
    ).length;

    const outras = reservas.length - confirmadas - pendentes;

    // Formatar datas no padrão brasileiro
    function formatarData(data) {
        if (!data) return '-';

        const [ano, mes, dia] = String(data)
            .slice(0, 10)
            .split('-');

        return `${dia}/${mes}/${ano}`;
    }

    return (
        <div className="dashboard">

            {/* Cabeçalho */}
            <header className="header">
                <div>
                    <h1>HotelHub</h1>
                    <p>Painel de gerenciamento de reservas</p>
                </div>
            </header>

            {/* Indicadores */}
            <section className="stats">

                <div className="stat-card">
                    <BedDouble />
                    <span>Total de reservas</span>
                    <strong>{reservas.length}</strong>
                </div>

                <div className="stat-card">
                    <CheckCircle />
                    <span>Confirmadas</span>
                    <strong>{confirmadas}</strong>
                </div>

                <div className="stat-card">
                    <Clock />
                    <span>Pendentes</span>
                    <strong>{pendentes}</strong>
                </div>

                <div className="stat-card">
                    <CalendarDays />
                    <span>Outras situações</span>
                    <strong>{outras}</strong>
                </div>

            </section>

            {/* Formulário de cadastro */}
            <ReservationForm onSuccess={carregarReservas} />

            {/* Listagem de reservas */}
            <section className="reservations">

                <h2>Reservas cadastradas</h2>

                {erro && (
                    <p className="error">{erro}</p>
                )}

                {carregando && (
                    <p>Carregando reservas...</p>
                )}

                {!carregando && !erro && (
                    <div className="table-wrapper">
                        <table>
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Hóspede</th>
                                    <th>Quarto</th>
                                    <th>Check-in</th>
                                    <th>Check-out</th>
                                    <th>Status</th>
                                </tr>
                            </thead>

                            <tbody>
                                {reservas.map(reserva => (
                                    <tr key={reserva.id}>

                                        <td>#{reserva.id}</td>

                                        <td>{reserva.guest_name}</td>

                                        <td>{reserva.room_number}</td>

                                        <td>
                                            {formatarData(reserva.check_in)}
                                        </td>

                                        <td>
                                            {formatarData(reserva.check_out)}
                                        </td>

                                        <td>
                                            <span
                                                className={`status ${reserva.status}`}
                                            >
                                                {reserva.status}
                                            </span>
                                        </td>

                                    </tr>
                                ))}

                                {reservas.length === 0 && (
                                    <tr>
                                        <td colSpan="6">
                                            Nenhuma reserva encontrada.
                                        </td>
                                    </tr>
                                )}

                            </tbody>
                        </table>
                    </div>
                )}

            </section>

        </div>
    );
}

export default App;
