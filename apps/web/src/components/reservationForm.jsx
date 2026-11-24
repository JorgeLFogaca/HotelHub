
import { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { DayPicker } from 'react-day-picker';
import { ptBR } from 'date-fns/locale';
import { format, parseISO, addDays } from 'date-fns';

import api from '../services/api';

import 'react-day-picker/style.css';
import './reservationForm.css';

function ReservationForm({ onSuccess }) {
    const [form, setForm] = useState({
        guest_name: '',
        room_number: '',
        check_in: '',
        check_out: ''
    });

    const [erro, setErro] = useState('');
    const [salvando, setSalvando] = useState(false);
    const [calendarioAberto, setCalendarioAberto] = useState(null);

    function handleChange(e) {
        const { name, value } = e.target;

        // Impedir números e caracteres especiais no nome
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

    function selecionarData(campo, data) {
        if (!data) return;

        const valor = format(data, 'yyyy-MM-dd');

        setForm(prev => {
            const atualizado = {
                ...prev,
                [campo]: valor
            };

            // Impedir check-out anterior ou igual ao check-in
            if (
                campo === 'check_in' &&
                prev.check_out &&
                prev.check_out <= valor
            ) {
                atualizado.check_out = '';
            }

            return atualizado;
        });

        setCalendarioAberto(null);
    }

    function formatarData(data) {
        if (!data) return 'Selecionar data';

        return format(parseISO(data), 'dd/MM/yyyy');
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setErro('');

        if (!form.guest_name.trim()) {
            setErro('Informe o nome do hóspede.');
            return;
        }

        if (!Number.isInteger(Number(form.room_number)) ||
            Number(form.room_number) <= 0) {
            setErro('Informe um número de quarto válido.');
            return;
        }

        if (!form.check_in || !form.check_out) {
            setErro('Selecione as datas da hospedagem.');
            return;
        }

        if (form.check_out <= form.check_in) {
            setErro('O check-out deve ser posterior ao check-in.');
            return;
        }

        setSalvando(true);

        try {
            await api.post('/reservations', {
                ...form,
                guest_name: form.guest_name.trim(),
                room_number: Number(form.room_number)
            });

            setForm({
                guest_name: '',
                room_number: '',
                check_in: '',
                check_out: ''
            });

            setCalendarioAberto(null);

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

    function renderizarCalendario(campo, titulo) {
        const valor = form[campo];
        const selecionado = valor ? parseISO(valor) : undefined;
        const aberto = calendarioAberto === campo;

        const dataMinima =
            campo === 'check_out' && form.check_in
                ? addDays(parseISO(form.check_in), 1)
                : undefined;

        return (
            <div className="date-picker">
                <label>{titulo}</label>

                <button
                    type="button"
                    className="date-trigger"
                    aria-expanded={aberto}
                    onClick={() =>
                        setCalendarioAberto(
                            aberto ? null : campo
                        )
                    }
                >
                    <span>{formatarData(valor)}</span>
                    <CalendarDays size={19} />
                </button>

                {aberto && (
                    <div className="calendar-popover">
                        <DayPicker
                            mode="single"
                            locale={ptBR}
                            weekStartsOn={0}
                            selected={selecionado}
                            defaultMonth={
                                selecionado || dataMinima || new Date()
                            }
                            onSelect={data =>
                                selecionarData(campo, data)
                            }
                            disabled={
                                dataMinima
                                    ? { before: dataMinima }
                                    : undefined
                            }
                            showOutsideDays
                            animate
                        />
                    </div>
                )}
            </div>
        );
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
                            placeholder="Nome completo"
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
                            placeholder="Ex: 101"
                            required
                        />
                    </label>

                    {renderizarCalendario('check_in', 'Check-in')}
                    {renderizarCalendario('check_out', 'Check-out')}

                </div>

                {erro && <p className="error">{erro}</p>}

                <button type="submit" disabled={salvando}>
                    {salvando
                        ? 'Salvando...'
                        : 'Cadastrar reserva'}
                </button>
            </form>
        </section>
    );
}

export default ReservationForm;
