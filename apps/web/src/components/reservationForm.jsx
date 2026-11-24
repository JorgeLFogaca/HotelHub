
import { useState } from 'react';
import api from '../services/api';

function ReservationForm({ onSuccess }) {
    const [form, setForm] = useState({
        guest_name: '',
        room_number: '',
        check_in: '',
        check_out: ''
    });

    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);

    function handleChange(e) {
        const { name, value } = e.target;

        if (name === 'guest_name') {
            if (value !== '' && !/^[\p{L}\s]+$/u.test(value)) {
                return;
            }
        }

        setForm(prev => ({
            ...prev,
            [name]: value
        }));
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErro('');

        if (form.check_out <= form.check_in) {
            setErro('O check-out deve ser posterior ao check-in.');
            return;
        }

        setSalvando(true);

        try {
            await api.post('/reservations', {
                ...form,
                room_number: Number(form.room_number)
            });

            setForm({
                guest_name: '',
                room_number: '',
                check_in: '',
                check_out: ''
            });

            onSuccess?.();

        } catch (error) {
            setErro(
                error.response?.data?.error ||
                'Erro ao cadastrar reserva.'
            );
        } finally {
            setSalvando(false);
        }
    }

    return (
        <section className="reservation-form">
            <h2>Nova reserva</h2>

            <form onSubmit={handleSubmit}>
                <div className="form-grid">
                    <label>
                        Nome do hóspede
                        <input
                            name="guest_name"
                            value={form.guest_name}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Número do quarto
                        <input
                            type="number"
                            name="room_number"
                            min="1"
                            step="1"
                            value={form.room_number}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Check-in
                        <input
                            type="date"
                            name="check_in"
                            value={form.check_in}
                            onChange={handleChange}
                            required
                        />
                    </label>

                    <label>
                        Check-out
                        <input
                            type="date"
                            name="check_out"
                            value={form.check_out}
                            onChange={handleChange}
                            min={form.check_in}
                            required
                        />
                    </label>
                </div>

                {erro && <p className="error">{erro}</p>}

                <button type="submit" disabled={salvando}>
                    {salvando ? 'Salvando...' : 'Cadastrar reserva'}
                </button>
            </form>
        </section>
    );
}

export default ReservationForm;
