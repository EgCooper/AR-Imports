import { formatMoney } from './clientConstants.js';

export default function ClientSummaryPanel({ summary, clientName }) {
  if (!summary) {
    return (
      <section className="app-card text-center">
        <p className="text-sm text-muted-foreground">Selecciona un cliente para ver su resumen ejecutivo.</p>
      </section>
    );
  }

  const { costoTotalPactado, totalPagado, saldoPendiente } = summary.resumenFinanciero;
  const liquidado = saldoPendiente <= 0;

  const cards = [
    { label: 'Costo total pactado', value: formatMoney(costoTotalPactado), highlight: false },
    { label: 'Total pagado', value: formatMoney(totalPagado), highlight: false },
    {
      label: liquidado ? 'Cuenta liquidada' : 'Saldo pendiente',
      value: liquidado ? 'Liquidado' : formatMoney(saldoPendiente),
      highlight: true,
    },
  ];

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Resumen ejecutivo</h2>
        {clientName && <p className="mt-1 text-sm text-muted-foreground">{clientName}</p>}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <article
            key={card.label}
            className={`rounded-xl border p-4 ${
              card.highlight
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card text-card-foreground'
            }`}
          >
            <p className={`text-xs font-medium uppercase tracking-wide ${card.highlight ? 'text-primary-foreground/80' : 'text-muted-foreground'}`}>
              {card.label}
            </p>
            <p className="mt-2 text-xl font-bold sm:text-2xl">{card.value}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
