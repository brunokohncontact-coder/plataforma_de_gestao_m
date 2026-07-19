import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  toCsv,
  centsToCsvAmount,
  csvDate,
  csvTime,
  transactionsToCsv,
  showsToCsv,
  annualSummaryToCsv,
  annualComparisonToCsv,
  annualComparisonCsvHeaders,
  quarterlySummaryToCsv,
  showProfitToCsv,
  showsProfitabilityComparisonToCsv,
  SHOW_PROFIT_COMPARISON_CSV_HEADERS,
  venueProfitToCsv,
  cityProfitComparisonToCsv,
  CITY_PROFIT_COMPARISON_CSV_HEADERS,
  contactProfitToCsv,
  roleProfitToCsv,
  contactActivityToCsv,
  contactsToCsv,
  CONTACT_DIRECTORY_CSV_HEADERS,
  type ContactDirectoryCsvRow,
  receivablesToCsv,
  receivablesByContactToCsv,
  paymentLagByContactToCsv,
  paymentLagToCsv,
  gigSeasonalityToCsv,
  gigSeasonalityComparisonToCsv,
  gigSeasonalityStallToCsv,
  GIG_SEASONALITY_STALL_CSV_HEADERS,
  monthlySeasonalityToCsv,
  MONTHLY_SEASONALITY_CSV_HEADERS,
  TRANSACTION_CSV_HEADERS,
  SHOW_CSV_HEADERS,
  ANNUAL_SUMMARY_CSV_HEADERS,
  QUARTERLY_SUMMARY_CSV_HEADERS,
  SHOW_PROFIT_CSV_HEADERS,
  CONTACT_PROFIT_CSV_HEADERS,
  ROLE_PROFIT_CSV_HEADERS,
  CONTACT_ACTIVITY_CSV_HEADERS,
  RECEIVABLE_CSV_HEADERS,
  RECEIVABLE_BY_CONTACT_CSV_HEADERS,
  PAYMENT_LAG_BY_CONTACT_CSV_HEADERS,
  PAYMENT_LAG_CSV_HEADERS,
  GIG_SEASONALITY_CSV_HEADERS,
  GIG_SEASONALITY_COMPARISON_CSV_HEADERS,
  weekdayPerformanceToCsv,
  WEEKDAY_PERFORMANCE_CSV_HEADERS,
  weekdayPerformanceComparisonToCsv,
  WEEKDAY_PERFORMANCE_COMPARISON_CSV_HEADERS,
  feeDistributionToCsv,
  FEE_DISTRIBUTION_CSV_HEADERS,
  showResultDistributionToCsv,
  showResultDistributionComparisonToCsv,
  SHOW_RESULT_DISTRIBUTION_COMPARISON_CSV_HEADERS,
  SHOW_RESULT_DISTRIBUTION_CSV_HEADERS,
  feeDistributionComparisonToCsv,
  FEE_DISTRIBUTION_COMPARISON_CSV_HEADERS,
  contactMarginComparisonToCsv,
  CONTACT_MARGIN_COMPARISON_CSV_HEADERS,
  roleMarginComparisonToCsv,
  ROLE_MARGIN_COMPARISON_CSV_HEADERS,
  incomeMixToCsv,
  INCOME_MIX_CSV_HEADERS,
  incomeMixComparisonToCsv,
  INCOME_MIX_COMPARISON_CSV_HEADERS,
  expenseMixToCsv,
  EXPENSE_MIX_CSV_HEADERS,
  expenseMixComparisonToCsv,
  EXPENSE_MIX_COMPARISON_CSV_HEADERS,
  categoryVariationToCsv,
  CATEGORY_VARIATION_CSV_HEADERS,
  gigCadenceToCsv,
  GIG_CADENCE_CSV_HEADERS,
  showGapsToCsv,
  SHOW_GAPS_CSV_HEADERS,
  gapDistributionToCsv,
  GAP_DISTRIBUTION_CSV_HEADERS,
  feeTrendToCsv,
  FEE_TREND_CSV_HEADERS,
  feeTrendByYearToCsv,
  FEE_TREND_BY_YEAR_CSV_HEADERS,
  clientRetentionToCsv,
  underpricedLoyalClientsToCsv,
  UNDERPRICED_LOYAL_CSV_HEADERS,
  retentionPriceMoversToCsv,
  clientConcentrationToCsv,
  CLIENT_CONCENTRATION_CSV_HEADERS,
  cancellationByContactToCsv,
  CANCELLATION_BY_CONTACT_CSV_HEADERS,
  reengageToCsv,
  REENGAGE_CSV_HEADERS,
  citiesToReengageToCsv,
  CITIES_REENGAGE_CSV_HEADERS,
  venuesToReengageToCsv,
  VENUES_REENGAGE_CSV_HEADERS,
  CLIENT_RETENTION_CSV_HEADERS,
  yearlyHistoryToCsv,
  YEARLY_HISTORY_CSV_HEADERS,
  recurringExpensesToCsv,
  RECURRING_EXPENSES_CSV_HEADERS,
  cashFlowToCsv,
  CASH_FLOW_CSV_HEADERS,
  cashflowProjectionToCsv,
  CASHFLOW_PROJECTION_CSV_HEADERS,
  bookedRevenueToCsv,
  BOOKED_REVENUE_CSV_HEADERS,
  pipelineToCsv,
  PIPELINE_CSV_HEADERS,
  stageDurationsToCsv,
  STAGE_DURATIONS_CSV_HEADERS,
  proposalDeliberationByContactToCsv,
  PROPOSAL_DELIBERATION_BY_CONTACT_CSV_HEADERS,
  proposalConversionToCsv,
  PROPOSAL_CONVERSION_CSV_HEADERS,
  proposalConversionComparisonToCsv,
  PROPOSAL_CONVERSION_COMPARISON_CSV_HEADERS,
  proposalConversionByContactToCsv,
  PROPOSAL_CONVERSION_BY_CONTACT_CSV_HEADERS,
  pipelineByContactToCsv,
  PIPELINE_BY_CONTACT_CSV_HEADERS,
  dueAgendaToCsv,
  DUE_AGENDA_CSV_HEADERS,
  yearPaceToCsv,
  YEAR_PACE_CSV_HEADERS,
  breakEvenToCsv,
  BREAK_EVEN_CSV_HEADERS,
  monthPaceToCsv,
  MONTH_PACE_CSV_HEADERS,
  monthlyReportToCsv,
  MONTHLY_REPORT_CSV_HEADERS,
  type MonthlyReportCsvView,
  monthlyGoalProgressToCsv,
  MONTHLY_GOAL_CSV_HEADERS,
  quarterlyGoalProgressToCsv,
  QUARTERLY_GOAL_CSV_HEADERS,
  type DueAgendaCsvTx,
  type CsvTransaction,
  type CsvShow,
  type CsvCalendarShow,
  monthCalendarToCsv,
  weekShowsToCsv,
  MONTH_CALENDAR_CSV_HEADERS,
  type CsvProfitShow,
  type ContactActivityCsvRow,
  type ReceivableCsvRow,
  type ReceivableByContactCsvRow,
  type PaymentLagByContactCsvRow,
  type PaymentLagCsvRow,
  openWeekendsToCsv,
  OPEN_WEEKENDS_CSV_HEADERS,
  yearEndProjectionToCsv,
  YEAR_END_PROJECTION_CSV_HEADERS,
  scheduleConflictsToCsv,
  SCHEDULE_CONFLICTS_CSV_HEADERS,
  taxReserveToCsv,
  TAX_RESERVE_CSV_HEADERS,
  bookingLeadTimeToCsv,
  BOOKING_LEAD_TIME_CSV_HEADERS,
  bookingLeadTimeByContactToCsv,
  BOOKING_LEAD_TIME_BY_CONTACT_CSV_HEADERS,
  type BookingLeadTimeByContactCsvRow,
  bookingLeadTimeComparisonToCsv,
  BOOKING_LEAD_TIME_COMPARISON_CSV_HEADERS,
  paymentLagComparisonToCsv,
  PAYMENT_LAG_COMPARISON_CSV_HEADERS,
  staleProposalsToCsv,
  STALE_PROPOSALS_CSV_HEADERS,
  funnelActivityFeedToCsv,
  FUNNEL_ACTIVITY_CSV_HEADERS,
  funnelActivityMonthlyToCsv,
  FUNNEL_ACTIVITY_MONTHLY_CSV_HEADERS,
  funnelActivityComparisonToCsv,
  FUNNEL_ACTIVITY_COMPARISON_CSV_HEADERS,
  funnelActivitySeasonalityToCsv,
  FUNNEL_ACTIVITY_SEASONALITY_CSV_HEADERS,
  funnelActivitySeasonalityStallToCsv,
  FUNNEL_ACTIVITY_SEASONALITY_STALL_CSV_HEADERS,
  funnelActivitySeasonalityComparisonToCsv,
  FUNNEL_ACTIVITY_SEASONALITY_COMPARISON_CSV_HEADERS,
} from "./csv";
import {
  findOpenWeekends,
  findScheduleConflicts,
  bookingLeadTime,
  compareBookingLeadTime,
  funnelStageDurations,
  compareFunnelStageDurations,
  indexStageDurationChanges,
  proposalDeliberationByContact,
  proposalOutcomes,
  compareProposalOutcomes,
  proposalOutcomesByContact,
  findStaleProposals,
  showGaps,
  gapDistribution,
  buildFunnelActivityFeed,
  groupFunnelActivityByMonth,
  compareFunnelActivityMonths,
  funnelActivitySeasonality,
  funnelActivitySeasonalityStall,
  compareFunnelActivitySeasonality,
  type ConflictShowLike,
  type LeadTimeShowLike,
  type StaleProposalShowLike,
} from "./shows";
import {
  annualSummary,
  compareAnnualSummaries,
  monthlySeasonality,
  quarterlySummary,
  gigSeasonality,
  compareGigSeasonality,
  gigSeasonalityStall,
  gigCadence,
  feeTrend,
  feeTrendByYear,
  cashFlowByMonth,
  projectCashflow,
  forecastBookedRevenue,
  buildDueAgenda,
  yearlyHistory,
  weekdayPerformance,
  compareWeekdayPerformance,
  feeDistribution,
  compareFeeDistribution,
  rankShowsByProfit,
  rankContactsByProfit,
  compareContactMargins,
  rankRolesByProfit,
  compareRoleMargins,
  showResultDistribution,
  compareShowResultDistribution,
  showPipeline,
  incomeMix,
  compareIncomeMix,
  expenseMix,
  compareExpenseMix,
  compareCategoryReports,
  yearToDatePace,
  currentMonthPace,
  monthYoYPace,
  summarizeFinances,
  compareSummaries,
  averageSummaries,
  monthlyGoalProgress,
  quarterlyGoalProgress,
  projectYearEnd,
  recurringExpenses,
  taxReserve,
  DEFAULT_TAX_RATE,
  yearEndScenarioView,
  computeBreakEven,
  computeDelta,
  paymentLag,
  comparePaymentLag,
  type ShowsProfitabilityComparison,
  type YearEndShowLike,
  type BreakEvenShowLike,
  type TxLike,
  type ShowProfitRow,
  type VenueProfitRow,
  type CityProfitChange,
  type ContactProfitRow,
  type RoleProfitRow,
  type ReceivableShowLike,
  type BookedRevenueShowLike,
  type ShowLike,
} from "./finance";
import {
  clientRetention,
  underpricedLoyalClients,
  retentionPriceMovers,
  clientConcentration,
  cancellationByContact,
  pipelineByContact,
  findContactsToReengage,
  type ContactRankLike,
} from "./contacts";
import { findCitiesToReengage, type CityReengageShowLike } from "./finance";
import { findVenuesToReengage, type VenueReengageShowLike } from "./finance";

describe("escapeCsvField", () => {
  it("não envolve em aspas campos simples", () => {
    expect(escapeCsvField("Cachê")).toBe("Cachê");
    expect(escapeCsvField("")).toBe("");
  });

  it("envolve em aspas quando há delimitador, aspas ou quebra de linha", () => {
    expect(escapeCsvField("a;b")).toBe('"a;b"');
    expect(escapeCsvField("linha1\nlinha2")).toBe('"linha1\nlinha2"');
    expect(escapeCsvField("com\rretorno")).toBe('"com\rretorno"');
  });

  it("duplica aspas internas", () => {
    expect(escapeCsvField('diz "oi"')).toBe('"diz ""oi"""');
  });

  it("respeita um delimitador customizado", () => {
    expect(escapeCsvField("a,b", ",")).toBe('"a,b"');
    expect(escapeCsvField("a;b", ",")).toBe("a;b"); // ; não é delimitador aqui
  });
});

describe("toCsv", () => {
  it("junta campos com ; e linhas com CRLF", () => {
    const csv = toCsv([
      ["Data", "Valor"],
      ["16/06/2026", "10,00"],
    ]);
    expect(csv).toBe("Data;Valor\r\n16/06/2026;10,00");
  });

  it("escapa campos por linha", () => {
    expect(toCsv([["a;b", "c"]])).toBe('"a;b";c');
  });
});

describe("centsToCsvAmount", () => {
  it("formata centavos com vírgula decimal e sem milhar", () => {
    expect(centsToCsvAmount(123456)).toBe("1234,56");
    expect(centsToCsvAmount(1)).toBe("0,01");
    expect(centsToCsvAmount(0)).toBe("0,00");
    expect(centsToCsvAmount(700)).toBe("7,00");
  });

  it("preserva o sinal negativo", () => {
    expect(centsToCsvAmount(-2550)).toBe("-25,50");
  });
});

describe("csvDate", () => {
  it("formata como DD/MM/AAAA em UTC", () => {
    expect(csvDate(new Date("2026-06-16T03:00:00Z"))).toBe("16/06/2026");
    expect(csvDate("2026-01-05T12:00:00Z")).toBe("05/01/2026");
  });
});

describe("csvTime", () => {
  it("formata a hora em UTC como HH:MM", () => {
    expect(csvTime(new Date("2026-06-16T20:30:00Z"))).toBe("20:30");
    expect(csvTime("2026-01-05T09:05:00Z")).toBe("09:05");
    expect(csvTime("2026-01-05T00:00:00Z")).toBe("00:00");
  });
});

describe("showsToCsv", () => {
  const show = (over: Partial<CsvShow> = {}): CsvShow => ({
    date: "2026-06-16T20:30:00Z",
    title: "Show no Bar X",
    venue: "Bar X",
    city: "São Paulo",
    status: "CONFIRMED",
    fee: 150000,
    notes: null,
    ...over,
  });

  it("emite o cabeçalho na ordem definida", () => {
    const csv = showsToCsv([]);
    expect(csv).toBe(SHOW_CSV_HEADERS.join(";"));
  });

  it("serializa um show com status legível, cachê com vírgula e data/hora UTC", () => {
    const csv = showsToCsv([show()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Data;Hora;Título;Local;Cidade;Status;Cachê (R$);Observações",
    );
    expect(lines[1]).toBe(
      "16/06/2026;20:30;Show no Bar X;Bar X;São Paulo;Confirmado;1500,00;",
    );
  });

  it("trata venue/city/notes ausentes como vazio", () => {
    const csv = showsToCsv([
      show({ venue: null, city: undefined, notes: undefined, fee: 0 }),
    ]);
    expect(csv.split("\r\n")[1]).toBe(
      "16/06/2026;20:30;Show no Bar X;;;Confirmado;0,00;",
    );
  });

  it("escapa campos com delimitador, aspas ou quebra de linha", () => {
    const csv = showsToCsv([
      show({ title: 'Festival "Verão"', venue: "Bar; Pub", notes: "linha1\nlinha2" }),
    ]);
    expect(csv.split("\r\n")[1]).toContain('"Festival ""Verão"""');
    expect(csv.split("\r\n")[1]).toContain('"Bar; Pub"');
  });

  it("mantém um status desconhecido como veio (defensivo)", () => {
    const csv = showsToCsv([show({ status: "ARQUIVADO" })]);
    expect(csv.split("\r\n")[1]).toContain(";ARQUIVADO;");
  });

  it("preserva a ordem das linhas recebidas", () => {
    const csv = showsToCsv([
      show({ title: "Primeiro" }),
      show({ title: "Segundo" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("Primeiro");
    expect(lines[2]).toContain("Segundo");
  });
});

describe("monthCalendarToCsv", () => {
  // Datas em horário LOCAL (mesma convenção da grade do calendário e de
  // `summarizeMonthShows`, ver shows.test.ts).
  const local = (y: number, m: number, d: number, hh = 20, mm = 0) =>
    new Date(y, m - 1, d, hh, mm);
  const show = (over: Partial<CsvCalendarShow> = {}): CsvCalendarShow => ({
    date: local(2026, 3, 12, 21, 30),
    title: "Show no Bar X",
    venue: "Bar X",
    status: "CONFIRMED",
    fee: 150000,
    ...over,
  });

  it("emite só o cabeçalho quando o mês não tem shows", () => {
    const csv = monthCalendarToCsv([], 2026, 3);
    expect(csv).toBe(MONTH_CALENDAR_CSV_HEADERS.join(";"));
  });

  it("serializa um show com data/hora LOCAL, status legível e cachê com vírgula", () => {
    const csv = monthCalendarToCsv([show()], 2026, 3);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe("Data;Hora;Título;Local;Status;Cachê (R$)");
    expect(lines[1]).toBe("12/03/2026;21:30;Show no Bar X;Bar X;Confirmado;1500,00");
  });

  it("lista os shows do mês em ordem de data e fecha com a linha Total", () => {
    const csv = monthCalendarToCsv(
      [
        show({ date: local(2026, 3, 20), title: "Terceiro", fee: 400_00, status: "PROPOSED" }),
        show({ date: local(2026, 3, 5), title: "Primeiro", fee: 100_00 }),
        show({ date: local(2026, 3, 12), title: "Segundo", fee: 250_00, status: "PLAYED" }),
      ],
      2026,
      3,
    );
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("Primeiro");
    expect(lines[2]).toContain("Segundo");
    expect(lines[3]).toContain("Terceiro");
    // Total: 3 shows (todos entram), cachê total = 100+250+400 = 750,00.
    expect(lines[4]).toBe("Total;;3 shows;;;750,00");
  });

  it("recorta pela data LOCAL: ignora as bordas de outros meses (como a grade)", () => {
    const csv = monthCalendarToCsv(
      [
        show({ date: local(2026, 2, 28), title: "Fev", fee: 100_00 }),
        show({ date: local(2026, 3, 1), title: "Mar-1", fee: 200_00 }),
        show({ date: local(2026, 3, 31), title: "Mar-31", fee: 300_00, status: "PROPOSED" }),
        show({ date: local(2026, 4, 1), title: "Abr", fee: 400_00 }),
      ],
      2026,
      3,
    );
    const lines = csv.split("\r\n");
    expect(csv).not.toContain("Fev");
    expect(csv).not.toContain("Abr");
    expect(lines[1]).toContain("Mar-1");
    expect(lines[2]).toContain("Mar-31");
    expect(lines[3]).toBe("Total;;2 shows;;;500,00");
  });

  it("no Total exclui cancelados da soma e do cachê, contando-os à parte", () => {
    const csv = monthCalendarToCsv(
      [
        show({ date: local(2026, 3, 5), title: "Firme", fee: 100_00 }),
        show({ date: local(2026, 3, 8), title: "Cai-1", fee: 999_00, status: "CANCELLED" }),
        show({ date: local(2026, 3, 9), title: "Cai-2", fee: 500_00, status: "CANCELLED" }),
      ],
      2026,
      3,
    );
    const lines = csv.split("\r\n");
    // Os cancelados aparecem nas linhas (a grade os mostra) mas ficam fora do Total.
    expect(csv).toContain("Cai-1");
    expect(csv).toContain("Cancelado");
    expect(lines[4]).toBe("Total;;1 show (2 cancelados);;;100,00");
  });

  it("usa singular no rótulo do Total com um único show/cancelado", () => {
    const csv = monthCalendarToCsv(
      [
        show({ date: local(2026, 3, 5), title: "Firme", fee: 100_00 }),
        show({ date: local(2026, 3, 8), title: "Caiu", fee: 999_00, status: "CANCELLED" }),
      ],
      2026,
      3,
    );
    const lines = csv.split("\r\n");
    expect(lines[3]).toBe("Total;;1 show (1 cancelado);;;100,00");
  });

  it("trata local ausente como vazio e mantém status desconhecido (defensivo)", () => {
    const csv = monthCalendarToCsv(
      [show({ venue: null, status: "ARQUIVADO", fee: undefined })],
      2026,
      3,
    );
    expect(csv.split("\r\n")[1]).toBe("12/03/2026;21:30;Show no Bar X;;ARQUIVADO;0,00");
  });
});

describe("weekShowsToCsv", () => {
  // Datas LOCAIS (a agenda semanal recorta pela data local, como a grade do mês).
  const local = (y: number, m: number, d: number, hh = 20, mm = 0) =>
    new Date(y, m - 1, d, hh, mm);
  const show = (over: Partial<CsvCalendarShow> = {}): CsvCalendarShow => ({
    date: local(2026, 3, 3, 21, 30),
    title: "Show no Bar X",
    venue: "Bar X",
    status: "CONFIRMED",
    fee: 150000,
    ...over,
  });

  it("emite só o cabeçalho quando a semana não tem shows", () => {
    expect(weekShowsToCsv([])).toBe(MONTH_CALENDAR_CSV_HEADERS.join(";"));
  });

  it("serializa um show com data/hora LOCAL, status legível e cachê com vírgula", () => {
    const lines = weekShowsToCsv([show()]).split("\r\n");
    expect(lines[0]).toBe("Data;Hora;Título;Local;Status;Cachê (R$)");
    expect(lines[1]).toBe("03/03/2026;21:30;Show no Bar X;Bar X;Confirmado;1500,00");
  });

  it("lista os shows da semana em ordem de data e fecha com a linha Total", () => {
    const lines = weekShowsToCsv([
      show({ date: local(2026, 3, 6), title: "Sexta", fee: 400_00, status: "PROPOSED" }),
      show({ date: local(2026, 3, 2), title: "Segunda", fee: 100_00 }),
      show({ date: local(2026, 3, 4), title: "Quarta", fee: 250_00, status: "PLAYED" }),
    ]).split("\r\n");
    expect(lines[1]).toContain("Segunda");
    expect(lines[2]).toContain("Quarta");
    expect(lines[3]).toContain("Sexta");
    // Total: 3 shows, cachê total = 100+250+400 = 750,00.
    expect(lines[4]).toBe("Total;;3 shows;;;750,00");
  });

  it("no Total exclui cancelados da soma e do cachê, contando-os à parte", () => {
    const lines = weekShowsToCsv([
      show({ date: local(2026, 3, 2), title: "Firme", fee: 100_00 }),
      show({ date: local(2026, 3, 3), title: "Cai-1", fee: 999_00, status: "CANCELLED" }),
      show({ date: local(2026, 3, 5), title: "Cai-2", fee: 500_00, status: "CANCELLED" }),
    ]).split("\r\n");
    expect(lines).toContain("03/03/2026;20:00;Cai-1;Bar X;Cancelado;999,00");
    expect(lines[4]).toBe("Total;;1 show (2 cancelados);;;100,00");
  });

  it("não recorta por data: soma toda a lista recebida (a janela já veio filtrada)", () => {
    // Diferente do mês, não há filtro por year/month — o chamador (weekRange) já recortou.
    const lines = weekShowsToCsv([
      show({ date: local(2026, 2, 28), title: "Sáb", fee: 100_00 }),
      show({ date: local(2026, 3, 1), title: "Dom", fee: 200_00, status: "PROPOSED" }),
    ]).split("\r\n");
    expect(lines[1]).toContain("Sáb");
    expect(lines[2]).toContain("Dom");
    expect(lines[3]).toBe("Total;;2 shows;;;300,00");
  });
});

describe("transactionsToCsv", () => {
  const base: CsvTransaction = {
    date: "2026-06-16T12:00:00Z",
    type: "INCOME",
    description: "Cachê show",
    category: "Cachê",
    amount: 150000,
    received: true,
    show: { title: "Bar do Zé" },
  };

  it("inclui o cabeçalho na primeira linha", () => {
    const csv = transactionsToCsv([]);
    expect(csv).toBe(TRANSACTION_CSV_HEADERS.join(";"));
  });

  it("serializa uma transação completa", () => {
    const csv = transactionsToCsv([base]);
    const [header, row] = csv.split("\r\n");
    expect(header).toBe("Data;Tipo;Descrição;Categoria;Valor (R$);Situação;Show");
    expect(row).toBe("16/06/2026;Receita;Cachê show;Cachê;1500,00;Recebido;Bar do Zé");
  });

  it("rotula a situação conforme tipo e status", () => {
    const pendingIncome = transactionsToCsv([{ ...base, received: false }]);
    expect(pendingIncome.split("\r\n")[1]).toContain(";Pendente;");

    const paidExpense = transactionsToCsv([
      { ...base, type: "EXPENSE", received: true },
    ]);
    expect(paidExpense.split("\r\n")[1]).toContain(";Pago;");

    const pendingExpense = transactionsToCsv([
      { ...base, type: "EXPENSE", received: false },
    ]);
    expect(pendingExpense.split("\r\n")[1]).toContain(";Pendente;");
  });

  it("deixa a coluna Show vazia quando não há show vinculado", () => {
    const csv = transactionsToCsv([{ ...base, show: null }]);
    expect(csv.split("\r\n")[1].endsWith(";")).toBe(true);
  });

  it("escapa descrições com ; ou aspas", () => {
    const csv = transactionsToCsv([
      { ...base, description: 'Aluguel; "som"', show: null },
    ]);
    expect(csv.split("\r\n")[1]).toContain('"Aluguel; ""som"""');
  });

  it("gera uma linha por transação além do cabeçalho", () => {
    const csv = transactionsToCsv([base, { ...base, description: "Outra" }]);
    expect(csv.split("\r\n")).toHaveLength(3);
  });
});

describe("annualSummaryToCsv", () => {
  it("emite cabeçalho + 12 meses + linha de total (14 linhas)", () => {
    const csv = annualSummaryToCsv(annualSummary([], 2026));
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(14);
    expect(lines[0]).toBe(ANNUAL_SUMMARY_CSV_HEADERS.join(";"));
    // Sem transações: meses zerados, na ordem jan→dez.
    expect(lines[1]).toBe("Janeiro 2026;0,00;0,00;0,00");
    expect(lines[12]).toBe("Dezembro 2026;0,00;0,00;0,00");
    expect(lines[13]).toBe("Total do ano (2026);0,00;0,00;0,00");
  });

  it("agrega receitas e despesas no mês certo e totaliza o ano", () => {
    const txs = [
      { type: "INCOME" as const, amount: 150000, category: "Cachê", date: "2026-03-10T12:00:00Z", received: true, showId: null },
      { type: "EXPENSE" as const, amount: 50000, category: "Transporte", date: "2026-03-20T12:00:00Z", received: true, showId: null },
      { type: "INCOME" as const, amount: 80000, category: "Cachê", date: "2026-07-01T12:00:00Z", received: false, showId: null },
    ];
    const csv = annualSummaryToCsv(annualSummary(txs, 2026));
    const lines = csv.split("\r\n");
    // Março (linha 3): 1500 receita, 500 despesa, 1000 resultado.
    expect(lines[3]).toBe("Março 2026;1500,00;500,00;1000,00");
    // Julho (linha 7): só 800 de receita.
    expect(lines[7]).toBe("Julho 2026;800,00;0,00;800,00");
    // Total: 2300 receita, 500 despesa, 1800 resultado.
    expect(lines[13]).toBe("Total do ano (2026);2300,00;500,00;1800,00");
  });

  it("preserva resultado negativo no mês e no total", () => {
    const txs = [
      { type: "EXPENSE" as const, amount: 30000, category: "Equipamento", date: "2026-01-15T12:00:00Z", received: true, showId: null },
    ];
    const csv = annualSummaryToCsv(annualSummary(txs, 2026));
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Janeiro 2026;0,00;300,00;-300,00");
    expect(lines[13]).toBe("Total do ano (2026);0,00;300,00;-300,00");
  });

  it("ignora transações de outros anos", () => {
    const txs = [
      { type: "INCOME" as const, amount: 99900, category: "Cachê", date: "2025-12-31T12:00:00Z", received: true, showId: null },
    ];
    const csv = annualSummaryToCsv(annualSummary(txs, 2026));
    expect(csv.split("\r\n")[13]).toBe("Total do ano (2026);0,00;0,00;0,00");
  });
});

describe("annualComparisonToCsv", () => {
  // Helper: monta a comparação {ano} vs {ano-1} a partir das transações.
  const compare = (txs: Parameters<typeof annualSummary>[0], year: number) =>
    compareAnnualSummaries(annualSummary(txs, year), annualSummary(txs, year - 1));

  it("emite cabeçalho (10 colunas com os dois anos) + 12 meses + total (14 linhas)", () => {
    const comparison = compare([], 2026);
    const csv = annualComparisonToCsv(comparison);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(14);
    expect(lines[0]).toBe(annualComparisonCsvHeaders(comparison).join(";"));
    // Os anos concreto e anterior entram nos rótulos das colunas.
    expect(lines[0]).toContain("Receitas 2025 (R$)");
    expect(lines[0]).toContain("Receitas 2026 (R$)");
    expect(lines[0]).toContain("Δ resultado (R$)");
    // Sem transações: tudo zerado, meses jan→dez.
    expect(lines[1]).toBe("Janeiro;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00");
    expect(lines[12]).toBe("Dezembro;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00");
    expect(lines[13]).toBe("Total do ano;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00;0,00");
  });

  it("traz os dois anos por mês com o delta absoluto de cada métrica", () => {
    const txs = [
      // 2025 (ano anterior): março com 1000 de receita.
      { type: "INCOME" as const, amount: 100000, category: "Cachê", date: "2025-03-10T12:00:00Z", received: true, showId: null },
      // 2026 (ano corrente): março com 1500 de receita e 500 de despesa.
      { type: "INCOME" as const, amount: 150000, category: "Cachê", date: "2026-03-10T12:00:00Z", received: true, showId: null },
      { type: "EXPENSE" as const, amount: 50000, category: "Transporte", date: "2026-03-20T12:00:00Z", received: true, showId: null },
    ];
    const csv = annualComparisonToCsv(compare(txs, 2026));
    const lines = csv.split("\r\n");
    // Março (linha 3): receita 1000→1500 (Δ +500), despesa 0→500 (Δ 500),
    // resultado 1000→1000 (Δ 0).
    expect(lines[3]).toBe("Março;1000,00;1500,00;500,00;0,00;500,00;500,00;1000,00;1000,00;0,00");
    // Total do ano espelha março (único mês com movimento).
    expect(lines[13]).toBe("Total do ano;1000,00;1500,00;500,00;0,00;500,00;500,00;1000,00;1000,00;0,00");
  });

  it("emite delta negativo quando a métrica cai ano a ano", () => {
    const txs = [
      // 2025: janeiro com 2000 de receita; 2026: janeiro com 800.
      { type: "INCOME" as const, amount: 200000, category: "Cachê", date: "2025-01-15T12:00:00Z", received: true, showId: null },
      { type: "INCOME" as const, amount: 80000, category: "Cachê", date: "2026-01-15T12:00:00Z", received: true, showId: null },
    ];
    const csv = annualComparisonToCsv(compare(txs, 2026));
    const lines = csv.split("\r\n");
    // Janeiro: receita 2000→800 (Δ -1200); despesa 0→0 (Δ 0); resultado 2000→800 (Δ -1200).
    expect(lines[1]).toBe("Janeiro;2000,00;800,00;-1200,00;0,00;0,00;0,00;2000,00;800,00;-1200,00");
    expect(lines[13]).toBe("Total do ano;2000,00;800,00;-1200,00;0,00;0,00;0,00;2000,00;800,00;-1200,00");
  });
});

describe("quarterlySummaryToCsv", () => {
  it("emite cabeçalho + 4 trimestres + linha de total (6 linhas)", () => {
    const csv = quarterlySummaryToCsv(quarterlySummary([], 2026));
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(6);
    expect(lines[0]).toBe(QUARTERLY_SUMMARY_CSV_HEADERS.join(";"));
    // Sem transações: trimestres zerados, na ordem Q1→Q4, com período.
    expect(lines[1]).toBe("1º tri 2026;Janeiro–Março;0,00;0,00;0,00");
    expect(lines[4]).toBe("4º tri 2026;Outubro–Dezembro;0,00;0,00;0,00");
    expect(lines[5]).toBe("Total do ano (2026);;0,00;0,00;0,00");
  });

  it("agrega receitas e despesas no trimestre certo e totaliza o ano", () => {
    const txs = [
      { type: "INCOME" as const, amount: 150000, category: "Cachê", date: "2026-03-10T12:00:00Z", received: true, showId: null },
      { type: "EXPENSE" as const, amount: 50000, category: "Transporte", date: "2026-03-20T12:00:00Z", received: true, showId: null },
      { type: "INCOME" as const, amount: 80000, category: "Cachê", date: "2026-07-01T12:00:00Z", received: false, showId: null },
    ];
    const csv = quarterlySummaryToCsv(quarterlySummary(txs, 2026));
    const lines = csv.split("\r\n");
    // Q1 (linha 1): 1500 receita, 500 despesa, 1000 resultado.
    expect(lines[1]).toBe("1º tri 2026;Janeiro–Março;1500,00;500,00;1000,00");
    // Q3 (linha 3): só 800 de receita.
    expect(lines[3]).toBe("3º tri 2026;Julho–Setembro;800,00;0,00;800,00");
    // Total: 2300 receita, 500 despesa, 1800 resultado.
    expect(lines[5]).toBe("Total do ano (2026);;2300,00;500,00;1800,00");
  });

  it("preserva resultado negativo no trimestre e no total", () => {
    const txs = [
      { type: "EXPENSE" as const, amount: 30000, category: "Equipamento", date: "2026-01-15T12:00:00Z", received: true, showId: null },
    ];
    const csv = quarterlySummaryToCsv(quarterlySummary(txs, 2026));
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("1º tri 2026;Janeiro–Março;0,00;300,00;-300,00");
    expect(lines[5]).toBe("Total do ano (2026);;0,00;300,00;-300,00");
  });

  it("ignora transações de outros anos", () => {
    const txs = [
      { type: "INCOME" as const, amount: 99900, category: "Cachê", date: "2025-12-31T12:00:00Z", received: true, showId: null },
    ];
    const csv = quarterlySummaryToCsv(quarterlySummary(txs, 2026));
    expect(csv.split("\r\n")[5]).toBe("Total do ano (2026);;0,00;0,00;0,00");
  });
});

describe("showProfitToCsv", () => {
  const row = (over: Partial<CsvProfitShow> = {}, pnlOver = {}): ShowProfitRow<CsvProfitShow> => ({
    show: {
      id: "s1",
      title: "Show no Bar X",
      date: "2026-06-16T20:30:00Z",
      status: "PLAYED",
      fee: 150000,
      ...over,
    },
    pnl: { fee: 150000, extraIncome: 20000, expenses: 30000, net: 140000, margin: 140000 / 170000, ...pnlOver },
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(showProfitToCsv([])).toBe(SHOW_PROFIT_CSV_HEADERS.join(";"));
  });

  it("serializa título, data UTC, status legível, valores com vírgula e margem em %", () => {
    const csv = showProfitToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Show;Data;Status;Cachê (R$);Extras (R$);Despesas (R$);Resultado (R$);Margem",
    );
    expect(lines[1]).toBe("Show no Bar X;16/06/2026;Realizado;1500,00;200,00;300,00;1400,00;82%");
  });

  it("deixa a margem vazia quando não há receita bruta", () => {
    const csv = showProfitToCsv([
      row({ fee: 0 }, { fee: 0, extraIncome: 0, expenses: 5000, net: -5000, margin: 0 }),
    ]);
    expect(csv.split("\r\n")[1]).toBe("Show no Bar X;16/06/2026;Realizado;0,00;0,00;50,00;-50,00;");
  });

  it("preserva a ordem das linhas recebidas", () => {
    const csv = showProfitToCsv([
      row({ id: "a", title: "Primeiro" }),
      row({ id: "b", title: "Segundo" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1]).toContain("Primeiro");
    expect(lines[2]).toContain("Segundo");
  });

  it("acrescenta uma linha Total com os agregados e a margem líquida ponderada", () => {
    const csv = showProfitToCsv([
      // net 1400, gross 1700
      row({ id: "a", title: "Primeiro" }),
      // fee 3000, extra 0, despesa 1000 -> net 2000, gross 3000
      row({ id: "b", title: "Segundo" }, { fee: 300000, extraIncome: 0, expenses: 100000, net: 200000, margin: 200000 / 300000 }),
    ]);
    const lines = csv.split("\r\n");
    // totalFee 4500, totalExtra 200, totalDespesa 1300, totalNet 3400, gross 4700
    // margem agregada = 3400 / 4700 ≈ 72%
    expect(lines[3]).toBe("Total;;;4500,00;200,00;1300,00;3400,00;72%");
  });

  it("não acrescenta linha Total quando não há linhas", () => {
    expect(showProfitToCsv([])).toBe(SHOW_PROFIT_CSV_HEADERS.join(";"));
  });
});

describe("showsProfitabilityComparisonToCsv", () => {
  const cmp = (over: Partial<ShowsProfitabilityComparison> = {}): ShowsProfitabilityComparison => ({
    avgNet: computeDelta(120000, 100000), // +200,00 -> +20%
    totalNet: computeDelta(360000, 300000), // +600,00 -> +20%
    count: computeDelta(3, 3), // sem variação
    trend: "up",
    ...over,
  });

  it("transpõe o comparativo em linhas por métrica + linha de veredito", () => {
    const lines = showsProfitabilityComparisonToCsv(cmp()).split("\r\n");
    expect(lines[0]).toBe("Métrica;Ano anterior;Ano corrente;Δ;Δ %");
    expect(lines[0]).toBe(SHOW_PROFIT_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines[1]).toBe("Resultado médio por show (R$);1000,00;1200,00;200,00;+20%");
    expect(lines[2]).toBe("Resultado total (R$);3000,00;3600,00;600,00;+20%");
    expect(lines[3]).toBe("Shows analisados;3;3;0;0%");
    expect(lines[4]).toBe("Veredito;Mais rentável por show;;;");
  });

  it("emite deltas e porcentagens negativos quando as métricas caem", () => {
    const lines = showsProfitabilityComparisonToCsv(
      cmp({
        avgNet: computeDelta(80000, 100000), // -200,00 -> -20%
        totalNet: computeDelta(160000, 400000), // -2400,00 -> -60%
        count: computeDelta(2, 4), // -2 shows -> -50%
        trend: "down",
      }),
    ).split("\r\n");
    expect(lines[1]).toBe("Resultado médio por show (R$);1000,00;800,00;-200,00;-20%");
    expect(lines[3]).toBe("Shows analisados;4;2;-2;-50%");
    expect(lines[4]).toBe("Veredito;Menos rentável por show;;;");
  });

  it("deixa o Δ % vazio quando não há base no ano anterior (previous 0)", () => {
    const lines = showsProfitabilityComparisonToCsv(
      cmp({ avgNet: computeDelta(50000, 0), trend: "up" }),
    ).split("\r\n");
    // Δ % (última coluna) vazio; o Δ absoluto segue presente.
    expect(lines[1]).toBe("Resultado médio por show (R$);0,00;500,00;500,00;");
  });

  it("rotula o veredito estável", () => {
    const lines = showsProfitabilityComparisonToCsv(cmp({ trend: "stable" })).split("\r\n");
    expect(lines[4]).toBe("Veredito;Estável;;;");
  });
});

describe("venueProfitToCsv", () => {
  const row = (over: Partial<VenueProfitRow> = {}): VenueProfitRow => ({
    key: "bar-x",
    name: "Bar X",
    showCount: 4,
    lossCount: 0,
    lossNet: 0,
    totalFee: 600000,
    totalExtra: 50000,
    totalExpenses: 80000,
    totalNet: 570000,
    avgNet: 142500,
    medianFee: 150000,
    margin: 570000 / 650000,
    ...over,
  });

  it("rotula a primeira coluna conforme groupLabel (Local × Cidade)", () => {
    expect(venueProfitToCsv([], "Local").split("\r\n")[0]).toBe(
      "Local;Shows;No vermelho;Prejuízo (R$);Cachê (R$);Cachê mediano (R$);Extras (R$);Despesas (R$);Resultado (R$);Média/show (R$)",
    );
    expect(venueProfitToCsv([], "Cidade").split("\r\n")[0].startsWith("Cidade;")).toBe(true);
  });

  it("serializa uma linha com o cachê mediano (amostra suficiente)", () => {
    const csv = venueProfitToCsv([row()], "Local");
    expect(csv.split("\r\n")[1]).toBe(
      "Bar X;4;0;0,00;6000,00;1500,00;500,00;800,00;5700,00;1425,00",
    );
  });

  it("serializa a contagem e o prejuízo dos shows no vermelho ('No vermelho' e 'Prejuízo (R$)')", () => {
    const csv = venueProfitToCsv([row({ lossCount: 2, lossNet: -15000 })], "Local");
    const cols = csv.split("\r\n")[1].split(";");
    // 3ª coluna (índice 2) = No vermelho; 4ª (índice 3) = Prejuízo (R$), com sinal.
    expect(cols[2]).toBe("2");
    expect(cols[3]).toBe("-150,00");
  });

  it("deixa o cachê mediano vazio abaixo da amostra mínima", () => {
    const csv = venueProfitToCsv([row({ showCount: 2 })], "Local");
    // 6ª coluna (índice 5) = cachê mediano, vazia com poucos shows.
    expect(csv.split("\r\n")[1].split(";")[5]).toBe("");
  });

  it("escapa nomes com delimitador", () => {
    const csv = venueProfitToCsv([row({ name: "Bar; Pub" })], "Local");
    expect(csv.split("\r\n")[1]).toContain('"Bar; Pub"');
  });

  it("sem comparativo → sem a coluna 'vs. {ano-1}' (comportamento dos locais inalterado)", () => {
    const csv = venueProfitToCsv([row()], "Cidade");
    expect(csv.split("\r\n")[0].includes("vs.")).toBe(false);
  });

  it("com comparativo → coluna 'vs. {ano-1} (shows)' com a variação por cidade", () => {
    const changes = new Map<string, CityProfitChange>([
      [
        "bar-x",
        {
          key: "bar-x",
          name: "Bar X",
          currentCount: 4,
          previousCount: 1,
          countDelta: 3,
          currentNet: 570000,
          previousNet: 100000,
          netDelta: 470000,
          currentLossCount: 0,
          previousLossCount: 0,
          lossCountDelta: 0,
          currentLossNet: 0,
          previousLossNet: 0,
          lossNetDelta: 0,
        },
      ],
    ]);
    const csv = venueProfitToCsv([row()], "Cidade", undefined, changes, 2025);
    const lines = csv.split("\r\n");
    expect(lines[0].endsWith("vs. 2025 (shows)")).toBe(true);
    // Última coluna da linha da cidade = +3 (ganhou 3 shows vs. o ano anterior).
    expect(lines[1].split(";").at(-1)).toBe("+3");
  });

  it("cidade sem entrada no comparativo fica com a coluna em branco", () => {
    const changes = new Map<string, CityProfitChange>();
    const csv = venueProfitToCsv([row()], "Cidade", undefined, changes, 2025);
    expect(csv.split("\r\n")[1].split(";").at(-1)).toBe("");
  });
});

describe("cityProfitComparisonToCsv", () => {
  const change = (over: Partial<CityProfitChange> = {}): CityProfitChange => ({
    key: "sao-paulo",
    name: "São Paulo",
    currentCount: 5,
    previousCount: 2,
    countDelta: 3,
    currentNet: 600000,
    previousNet: 200000,
    netDelta: 400000,
    currentLossCount: 0,
    previousLossCount: 0,
    lossCountDelta: 0,
    currentLossNet: 0,
    previousLossNet: 0,
    lossNetDelta: 0,
    ...over,
  });

  it("emite só cabeçalho + Total zerado quando não há mudanças", () => {
    const csv = cityProfitComparisonToCsv([]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CITY_PROFIT_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines[1]).toBe("Total;0;0;0;0;0;0;0,00;0,00;0,00;0,00;0,00;0,00;");
    expect(lines.length).toBe(2);
  });

  it("serializa uma cidade que cresceu com Δ assinados e tendência 'Subiu'", () => {
    const csv = cityProfitComparisonToCsv([change()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Cidade;Shows (ano anterior);Shows (ano corrente);Δ shows;No vermelho (ano anterior);No vermelho (ano corrente);Δ no vermelho;Prejuízo (ano anterior) (R$);Prejuízo (ano corrente) (R$);Δ prejuízo (R$);Resultado (ano anterior) (R$);Resultado (ano corrente) (R$);Δ resultado (R$);Tendência",
    );
    expect(lines[1]).toBe("São Paulo;2;5;+3;0;0;0;0,00;0,00;0,00;2000,00;6000,00;4000,00;Subiu");
  });

  it("marca 'Caiu' e Δ negativos numa cidade que perdeu shows", () => {
    const csv = cityProfitComparisonToCsv([
      change({ currentCount: 1, previousCount: 4, countDelta: -3, currentNet: 100000, previousNet: 500000, netDelta: -400000 }),
    ]);
    const cols = csv.split("\r\n")[1].split(";");
    expect(cols[3]).toBe("-3");
    expect(cols[12]).toBe("-4000,00");
    expect(cols[13]).toBe("Caiu");
  });

  it("serializa as colunas do vermelho (contagem + prejuízo, Δ com sinal) e soma no Total", () => {
    // Praça que piorou: 1 show no vermelho neste ano (nenhum no anterior),
    // prejuízo -300,00 (era 0). lossNet ≤ 0, então Δ prejuízo negativo = piora.
    const csv = cityProfitComparisonToCsv([
      change({
        currentLossCount: 1,
        previousLossCount: 0,
        lossCountDelta: 1,
        currentLossNet: -30000,
        previousLossNet: 0,
        lossNetDelta: -30000,
      }),
    ]);
    const lines = csv.split("\r\n");
    const cols = lines[1].split(";");
    // No vermelho: anterior 0, corrente 1, Δ +1.
    expect(cols[4]).toBe("0");
    expect(cols[5]).toBe("1");
    expect(cols[6]).toBe("+1");
    // Prejuízo: anterior 0,00, corrente -300,00, Δ -300,00.
    expect(cols[7]).toBe("0,00");
    expect(cols[8]).toBe("-300,00");
    expect(cols[9]).toBe("-300,00");
    // Total espelha a única linha nas colunas do vermelho.
    expect(lines[2]).toBe("Total;2;5;+3;0;1;+1;0,00;-300,00;-300,00;2000,00;6000,00;4000,00;");
  });

  it("desempata a tendência pelo resultado quando o nº de shows não muda", () => {
    const csv = cityProfitComparisonToCsv([
      change({ countDelta: 0, currentCount: 3, previousCount: 3, currentNet: 500000, previousNet: 300000, netDelta: 200000 }),
    ]);
    expect(csv.split("\r\n")[1].split(";")[13]).toBe("Subiu");
  });

  it("inclui a 'Sem cidade' (dado real) e soma o Total das duas colunas de ano", () => {
    const csv = cityProfitComparisonToCsv([
      change(),
      change({ key: "", name: "Sem cidade", currentCount: 1, previousCount: 0, countDelta: 1, currentNet: 50000, previousNet: 0, netDelta: 50000 }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[2].startsWith("Sem cidade;")).toBe(true);
    // Total: shows anterior 2+0=2, corrente 5+1=6, Δ +4; resultado -> 2000/6500.
    expect(lines[3]).toBe("Total;2;6;+4;0;0;0;0,00;0,00;0,00;2000,00;6500,00;4500,00;");
  });

  it("troca só o rótulo da 1ª coluna via groupLabel (comparativo por local)", () => {
    const csv = cityProfitComparisonToCsv([change()], undefined, "Local");
    const lines = csv.split("\r\n");
    // Só o cabeçalho da 1ª coluna muda; as demais colunas seguem neutras.
    expect(lines[0]).toBe(
      "Local;Shows (ano anterior);Shows (ano corrente);Δ shows;No vermelho (ano anterior);No vermelho (ano corrente);Δ no vermelho;Prejuízo (ano anterior) (R$);Prejuízo (ano corrente) (R$);Δ prejuízo (R$);Resultado (ano anterior) (R$);Resultado (ano corrente) (R$);Δ resultado (R$);Tendência",
    );
    // Os dados saem idênticos ao comparativo por cidade.
    expect(lines[1]).toBe("São Paulo;2;5;+3;0;0;0;0,00;0,00;0,00;2000,00;6000,00;4000,00;Subiu");
  });
});

describe("contactProfitToCsv", () => {
  const row = (over: Partial<ContactProfitRow> = {}): ContactProfitRow => ({
    contact: { id: "c1", name: "Produtora Lua", role: "PROMOTER" },
    showCount: 5,
    totalFee: 750000,
    totalExtra: 0,
    totalExpenses: 100000,
    totalNet: 650000,
    avgNet: 130000,
    avgFee: 150000,
    medianFee: 150000,
    margin: 650000 / 750000,
    lossCount: 0,
    lossNet: 0,
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(contactProfitToCsv([])).toBe(CONTACT_PROFIT_CSV_HEADERS.join(";"));
  });

  it("serializa contratante com papel legível e valores com vírgula", () => {
    const csv = contactProfitToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Contratante;Papel;Shows;No vermelho;Prejuízo (R$);Cachê (R$);Extras (R$);Despesas (R$);Cachê médio (R$);Cachê mediano (R$);Resultado (R$);Média/show (R$)",
    );
    expect(lines[1]).toBe(
      "Produtora Lua;Produtor/Promoter;5;0;0,00;7500,00;0,00;1000,00;1500,00;1500,00;6500,00;1300,00",
    );
  });

  it("usa 'Sem contratante' e papel em branco para o grupo sem contato", () => {
    const csv = contactProfitToCsv([row({ contact: null })]);
    const cols = csv.split("\r\n")[1].split(";");
    expect(cols[0]).toBe("Sem contratante");
    expect(cols[1]).toBe("");
  });

  it("traz o lossCount na coluna 'No vermelho' (entre Shows e Cachê)", () => {
    const csv = contactProfitToCsv([row({ showCount: 5, lossCount: 2 })]);
    const cols = csv.split("\r\n")[1].split(";");
    // 4ª coluna (índice 3) = No vermelho, logo após Shows (índice 2).
    expect(cols[2]).toBe("5");
    expect(cols[3]).toBe("2");
  });

  it("traz o lossNet na coluna 'Prejuízo (R$)' (logo após No vermelho)", () => {
    const csv = contactProfitToCsv([row({ showCount: 5, lossCount: 2, lossNet: -45000 })]);
    const cols = csv.split("\r\n")[1].split(";");
    // 5ª coluna (índice 4) = Prejuízo (R$), logo após No vermelho (índice 3).
    expect(cols[3]).toBe("2");
    expect(cols[4]).toBe("-450,00");
  });

  it("emite Prejuízo 0,00 quando o grupo não tem show no vermelho", () => {
    const csv = contactProfitToCsv([row({ lossCount: 0, lossNet: 0 })]);
    expect(csv.split("\r\n")[1].split(";")[4]).toBe("0,00");
  });

  it("deixa o cachê mediano vazio abaixo da amostra mínima", () => {
    const csv = contactProfitToCsv([row({ showCount: 2 })]);
    // 10ª coluna (índice 9) = cachê mediano (deslocada +1 pela coluna Prejuízo).
    expect(csv.split("\r\n")[1].split(";")[9]).toBe("");
  });
});

describe("roleProfitToCsv", () => {
  const row = (over: Partial<RoleProfitRow> = {}): RoleProfitRow => ({
    role: "VENUE",
    showCount: 5,
    totalFee: 750000,
    totalExtra: 0,
    totalExpenses: 100000,
    totalNet: 650000,
    avgNet: 130000,
    avgFee: 150000,
    medianFee: 150000,
    margin: 650000 / 750000,
    lossCount: 0,
    lossNet: 0,
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(roleProfitToCsv([])).toBe(ROLE_PROFIT_CSV_HEADERS.join(";"));
  });

  it("serializa o papel com rótulo legível e valores com vírgula (sem coluna de contratante)", () => {
    const csv = roleProfitToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Papel;Shows;No vermelho;Prejuízo (R$);Cachê (R$);Extras (R$);Despesas (R$);Cachê médio (R$);Cachê mediano (R$);Resultado (R$);Média/show (R$)",
    );
    expect(lines[1]).toBe(
      "Casa de show;5;0;0,00;7500,00;0,00;1000,00;1500,00;1500,00;6500,00;1300,00",
    );
  });

  it("usa 'Sem contratante' para o grupo sem papel (role null)", () => {
    const csv = roleProfitToCsv([row({ role: null })]);
    expect(csv.split("\r\n")[1].split(";")[0]).toBe("Sem contratante");
  });

  it("traz o lossCount na coluna 'No vermelho' (entre Shows e Cachê)", () => {
    const csv = roleProfitToCsv([row({ showCount: 5, lossCount: 3 })]);
    const cols = csv.split("\r\n")[1].split(";");
    // 3ª coluna (índice 2) = No vermelho, logo após Shows (índice 1).
    expect(cols[1]).toBe("5");
    expect(cols[2]).toBe("3");
  });

  it("traz o lossNet na coluna 'Prejuízo (R$)' (logo após No vermelho)", () => {
    const csv = roleProfitToCsv([row({ showCount: 5, lossCount: 3, lossNet: -72000 })]);
    const cols = csv.split("\r\n")[1].split(";");
    // 4ª coluna (índice 3) = Prejuízo (R$), logo após No vermelho (índice 2).
    expect(cols[2]).toBe("3");
    expect(cols[3]).toBe("-720,00");
  });

  it("deixa o cachê mediano vazio abaixo da amostra mínima", () => {
    const csv = roleProfitToCsv([row({ showCount: 2 })]);
    // 9ª coluna (índice 8) = cachê mediano (deslocada +1 pela coluna Prejuízo).
    expect(csv.split("\r\n")[1].split(";")[8]).toBe("");
  });
});

describe("contactActivityToCsv", () => {
  const row = (over: Partial<ContactActivityCsvRow> = {}): ContactActivityCsvRow => ({
    contact: { name: "Produtora Lua", role: "PROMOTER" },
    totalShows: 5,
    activeShows: 4,
    upcomingShows: 2,
    totalFee: 600000,
    lastShowDate: new Date("2026-03-10T12:00:00Z"),
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(contactActivityToCsv([])).toBe(CONTACT_ACTIVITY_CSV_HEADERS.join(";"));
  });

  it("serializa contato com papel legível, shows ativos/total e cachê com vírgula", () => {
    const csv = contactActivityToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Contato;Papel;Shows ativos;Shows (total);Próximos;Cachê total (R$);Último show",
    );
    expect(lines[1]).toBe("Produtora Lua;Produtor/Promoter;4;5;2;6000,00;10/03/2026");
  });

  it("deixa o último show vazio quando não há data", () => {
    const csv = contactActivityToCsv([row({ lastShowDate: null })]);
    const cols = csv.split("\r\n")[1].split(";");
    // 7ª coluna (índice 6) = último show.
    expect(cols[6]).toBe("");
  });

  it("preserva a ordem das linhas recebidas", () => {
    const csv = contactActivityToCsv([
      row({ contact: { name: "Casa A", role: "VENUE" } }),
      row({ contact: { name: "Casa B", role: "VENUE" } }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("Casa A;")).toBe(true);
    expect(lines[2].startsWith("Casa B;")).toBe(true);
  });
});

describe("contactsToCsv", () => {
  const row = (over: Partial<ContactDirectoryCsvRow> = {}): ContactDirectoryCsvRow => ({
    name: "Produtora Lua",
    role: "PROMOTER",
    email: "lua@exemplo.com",
    phone: "(11) 90000-0000",
    notes: "Paga em dia",
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(contactsToCsv([])).toBe(CONTACT_DIRECTORY_CSV_HEADERS.join(";"));
  });

  it("serializa contato com papel legível e todos os campos", () => {
    const lines = contactsToCsv([row()]).split("\r\n");
    expect(lines[0]).toBe("Nome;Tipo;E-mail;Telefone;Notas");
    expect(lines[1]).toBe(
      "Produtora Lua;Produtor/Promoter;lua@exemplo.com;(11) 90000-0000;Paga em dia",
    );
  });

  it("deixa e-mail, telefone e notas vazios quando ausentes (null/undefined)", () => {
    const cols = contactsToCsv([
      row({ email: null, phone: undefined, notes: null }),
    ])
      .split("\r\n")[1]
      .split(";");
    expect(cols[2]).toBe("");
    expect(cols[3]).toBe("");
    expect(cols[4]).toBe("");
  });

  it("normaliza quebras de linha das notas para um espaço (uma linha por contato)", () => {
    const csv = contactsToCsv([row({ notes: "Linha 1\nLinha 2\r\n  Linha 3" })]);
    // Sem quebra de linha interna sobrando: só o CRLF separador entre cabeçalho e a linha.
    expect(csv.split("\r\n")).toHaveLength(2);
    expect(csv.split("\r\n")[1].endsWith("Linha 1 Linha 2 Linha 3")).toBe(true);
  });

  it("escapa o delimitador e as aspas nos campos (RFC 4180)", () => {
    const csv = contactsToCsv([row({ name: 'Bar "O Ponto"; Ltda', notes: "" })]);
    expect(csv.split("\r\n")[1].startsWith('"Bar ""O Ponto""; Ltda";')).toBe(true);
  });

  it("cai em 'Outro' para papel desconhecido (defensivo)", () => {
    const cols = contactsToCsv([row({ role: "ALIEN" })]).split("\r\n")[1].split(";");
    expect(cols[1]).toBe("Outro");
  });

  it("preserva a ordem das linhas recebidas", () => {
    const lines = contactsToCsv([
      row({ name: "Ana" }),
      row({ name: "Bruno" }),
    ]).split("\r\n");
    expect(lines[1].startsWith("Ana;")).toBe(true);
    expect(lines[2].startsWith("Bruno;")).toBe(true);
  });
});

describe("receivablesToCsv", () => {
  const row = (over: Partial<ReceivableCsvRow> = {}): ReceivableCsvRow => ({
    show: {
      title: "Festival de Verão",
      date: new Date("2026-01-15T20:00:00Z"),
      venue: "Teatro Municipal",
      city: "Curitiba",
    },
    fee: 200000,
    collected: 50000,
    outstanding: 150000,
    daysOutstanding: 45,
    unregistered: false,
    registeredPending: 0,
    promiseStatus: "none",
    promisedAt: null,
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(receivablesToCsv([])).toBe(RECEIVABLE_CSV_HEADERS.join(";"));
  });

  it("serializa um recebível com valores em reais, dias e situação", () => {
    const csv = receivablesToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Show;Data;Local;Cidade;Dias em atraso;Cachê (R$);Recebido (R$);A receber (R$);Situação;Promessa;Status promessa",
    );
    expect(lines[1]).toBe(
      "Festival de Verão;15/01/2026;Teatro Municipal;Curitiba;45;2000,00;500,00;1500,00;Parcial recebido;;",
    );
  });

  it("marca 'Receita não lançada' quando nada foi lançado", () => {
    const csv = receivablesToCsv([
      row({ unregistered: true, collected: 0, registeredPending: 0 }),
    ]);
    expect(csv.split("\r\n")[1].split(";")[8]).toBe("Receita não lançada");
  });

  it("marca 'Lançada pendente' quando há receita lançada mas não recebida", () => {
    const csv = receivablesToCsv([
      row({ unregistered: false, collected: 0, registeredPending: 80000 }),
    ]);
    expect(csv.split("\r\n")[1].split(";")[8]).toBe("Lançada pendente");
  });

  it("serializa a data e o status da promessa (vencida)", () => {
    const csv = receivablesToCsv([
      row({ promiseStatus: "broken", promisedAt: new Date("2026-02-10T12:00:00Z") }),
    ]);
    const cols = csv.split("\r\n")[1].split(";");
    expect(cols[9]).toBe("10/02/2026");
    expect(cols[10]).toBe("Vencida");
  });

  it("deixa promessa e status em branco sem data prometida", () => {
    const cols = receivablesToCsv([row()]).split("\r\n")[1].split(";");
    expect(cols[9]).toBe("");
    expect(cols[10]).toBe("");
  });

  it("preserva a ordem das linhas recebidas", () => {
    const csv = receivablesToCsv([
      row({ show: { title: "Show A", date: new Date("2026-01-01T12:00:00Z") } }),
      row({ show: { title: "Show B", date: new Date("2026-01-02T12:00:00Z") } }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("Show A;")).toBe(true);
    expect(lines[2].startsWith("Show B;")).toBe(true);
  });
});

describe("receivablesByContactToCsv", () => {
  const row = (
    over: Partial<ReceivableByContactCsvRow> = {},
  ): ReceivableByContactCsvRow => ({
    contact: { name: "Bar do Zé", role: "VENUE" },
    outstanding: 150000,
    showCount: 3,
    maxDaysOutstanding: 62,
    weightedAvgDays: 40,
    share: 0.6,
    brokenCount: 0,
    brokenOutstanding: 0,
    awaitingCount: 0,
    awaitingOutstanding: 0,
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(receivablesByContactToCsv([])).toBe(
      RECEIVABLE_BY_CONTACT_CSV_HEADERS.join(";"),
    );
  });

  it("serializa um devedor com valores, atrasos e participação", () => {
    const csv = receivablesByContactToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Contratante;Papel;A receber (R$);Shows;Pior atraso (dias);Atraso médio (dias);Participação;Promessas vencidas;A receber vencido (R$);Sem cobrança iniciada;A receber sem promessa (R$)",
    );
    expect(lines[1]).toBe(
      "Bar do Zé;Casa de show;1500,00;3;62;40;60%;0;0,00;0;0,00",
    );
  });

  it("arredonda a participação para porcentagem inteira", () => {
    const cols = receivablesByContactToCsv([row({ share: 0.337 })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[6]).toBe("34%");
  });

  it("serializa o grupo sem contratante com nome fixo e papel em branco", () => {
    const cols = receivablesByContactToCsv([row({ contact: null })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[0]).toBe("Sem contratante");
    expect(cols[1]).toBe("");
  });

  it("expõe as promessas vencidas (contagem + valor)", () => {
    const cols = receivablesByContactToCsv([
      row({ brokenCount: 2, brokenOutstanding: 90000 }),
    ])
      .split("\r\n")[1]
      .split(";");
    expect(cols[7]).toBe("2");
    expect(cols[8]).toBe("900,00");
  });

  it("expõe a cobrança que ainda nem começou (contagem + valor)", () => {
    const cols = receivablesByContactToCsv([
      row({ awaitingCount: 3, awaitingOutstanding: 120000 }),
    ])
      .split("\r\n")[1]
      .split(";");
    expect(cols[9]).toBe("3");
    expect(cols[10]).toBe("1200,00");
  });

  it("preserva a ordem das linhas recebidas (maior devedor primeiro)", () => {
    const csv = receivablesByContactToCsv([
      row({ contact: { name: "Maior", role: "PROMOTER" }, outstanding: 300000 }),
      row({ contact: { name: "Menor", role: "VENUE" }, outstanding: 100000 }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("Maior;")).toBe(true);
    expect(lines[2].startsWith("Menor;")).toBe(true);
  });
});

describe("paymentLagByContactToCsv", () => {
  const row = (
    over: Partial<PaymentLagByContactCsvRow> = {},
  ): PaymentLagByContactCsvRow => ({
    contact: { name: "Bar do Zé", role: "VENUE" },
    received: 150000,
    showCount: 4,
    avgDays: 22,
    medianDays: 18,
    lastDays: 45,
    share: 0.6,
    bucket: "d30",
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(paymentLagByContactToCsv([])).toBe(
      PAYMENT_LAG_BY_CONTACT_CSV_HEADERS.join(";"),
    );
  });

  it("serializa um contratante com recebido, prazos e velocidade", () => {
    const csv = paymentLagByContactToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Contratante;Papel;Recebido (R$);Shows;Prazo médio (dias);Prazo mediano (dias);Pior prazo (dias);Participação;Velocidade",
    );
    expect(lines[1]).toBe("Bar do Zé;Casa de show;1500,00;4;22;18;45;60%;8 a 30 dias");
  });

  it("arredonda a participação para porcentagem inteira", () => {
    const cols = paymentLagByContactToCsv([row({ share: 0.337 })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[7]).toBe("34%");
  });

  it("omite o prazo mediano abaixo da amostra mínima (espelha o '—' da UI)", () => {
    const cols = paymentLagByContactToCsv([row({ showCount: 2, medianDays: 18 })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[5]).toBe("");
  });

  it("preserva prazos negativos (pagamento adiantado)", () => {
    const cols = paymentLagByContactToCsv([
      row({ avgDays: -3, medianDays: -2, lastDays: -1, showCount: 3 }),
    ])
      .split("\r\n")[1]
      .split(";");
    expect(cols[4]).toBe("-3");
    expect(cols[5]).toBe("-2");
    expect(cols[6]).toBe("-1");
  });

  it("serializa o grupo sem contratante com nome fixo e papel em branco", () => {
    const cols = paymentLagByContactToCsv([row({ contact: null })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[0]).toBe("Sem contratante");
    expect(cols[1]).toBe("");
  });

  it("preserva a ordem das linhas recebidas (mais lento primeiro)", () => {
    const csv = paymentLagByContactToCsv([
      row({ contact: { name: "Lento", role: "PROMOTER" }, avgDays: 50, bucket: "slow" }),
      row({ contact: { name: "Rápido", role: "VENUE" }, avgDays: 3, bucket: "d7" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("Lento;")).toBe(true);
    expect(lines[2].startsWith("Rápido;")).toBe(true);
  });

  it("sem previousYear não adiciona a coluna de tendência (saída histórica)", () => {
    const cols = paymentLagByContactToCsv([row({ avgDaysDelta: 12 })])
      .split("\r\n")[0]
      .split(";");
    expect(cols).toHaveLength(PAYMENT_LAG_BY_CONTACT_CSV_HEADERS.length);
    expect(cols.some((c) => c.includes("vs."))).toBe(false);
  });

  it("com previousYear adiciona a coluna 'vs. {ano-1}' no cabeçalho", () => {
    const header = paymentLagByContactToCsv([], ";", 2023).split("\r\n")[0];
    expect(header.endsWith(";vs. 2023 (dias)")).toBe(true);
  });

  it("emite a variação do prazo médio com sinal quando o contratante mudou", () => {
    const cols = paymentLagByContactToCsv([row({ avgDaysDelta: 12 })], ";", 2023)
      .split("\r\n")[1]
      .split(";");
    expect(cols[cols.length - 1]).toBe("+12");
  });

  it("emite variação negativa (passou a pagar mais rápido) sem '+'", () => {
    const cols = paymentLagByContactToCsv([row({ avgDaysDelta: -5 })], ";", 2023)
      .split("\r\n")[1]
      .split(";");
    expect(cols[cols.length - 1]).toBe("-5");
  });

  it("marca 'novo' quem só apareceu no ano atual", () => {
    const cols = paymentLagByContactToCsv([row({ isNew: true })], ";", 2023)
      .split("\r\n")[1]
      .split(";");
    expect(cols[cols.length - 1]).toBe("novo");
  });

  it("deixa a coluna de tendência em branco para linhas não comparáveis", () => {
    const cols = paymentLagByContactToCsv([row({ contact: null })], ";", 2023)
      .split("\r\n")[1]
      .split(";");
    expect(cols[cols.length - 1]).toBe("");
  });
});

describe("paymentLagToCsv", () => {
  const row = (over: Partial<PaymentLagCsvRow> = {}): PaymentLagCsvRow => ({
    show: {
      title: "Festival de Verão",
      date: "2024-03-15T00:00:00.000Z",
      venue: "Bar do Zé",
      city: "Recife",
    },
    received: 150000,
    paymentCount: 2,
    avgDays: 22,
    lastDays: 45,
    bucket: "d30",
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(paymentLagToCsv([])).toBe(PAYMENT_LAG_CSV_HEADERS.join(";"));
  });

  it("serializa um show com data, local, cidade, recebido, prazos e velocidade", () => {
    const csv = paymentLagToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Show;Data;Local;Cidade;Recebido (R$);Recebimentos;Prazo médio (dias);Pior prazo (dias);Velocidade",
    );
    expect(lines[1]).toBe(
      "Festival de Verão;15/03/2024;Bar do Zé;Recife;1500,00;2;22;45;8 a 30 dias",
    );
  });

  it("deixa local e cidade em branco quando ausentes", () => {
    const cols = paymentLagToCsv([row({ show: { title: "Solo", date: "2024-01-01T00:00:00.000Z" } })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[2]).toBe("");
    expect(cols[3]).toBe("");
  });

  it("preserva prazos negativos (pagamento adiantado)", () => {
    const cols = paymentLagToCsv([row({ avgDays: -3, lastDays: -1 })])
      .split("\r\n")[1]
      .split(";");
    expect(cols[6]).toBe("-3");
    expect(cols[7]).toBe("-1");
  });

  it("preserva a ordem das linhas recebidas (mais lento primeiro)", () => {
    const csv = paymentLagToCsv([
      row({ show: { title: "Lento", date: "2024-01-01T00:00:00.000Z" }, avgDays: 70, bucket: "slow" }),
      row({ show: { title: "Rápido", date: "2024-02-01T00:00:00.000Z" }, avgDays: 3, bucket: "d7" }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("Lento;")).toBe(true);
    expect(lines[2].startsWith("Rápido;")).toBe(true);
  });
});

describe("gigSeasonalityToCsv", () => {
  // `now` fixo no futuro para que todos os shows forjados contem como realizados.
  const NOW = "2025-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2024-03-10T00:00:00.000Z",
    ...over,
  });

  it("sempre emite as 12 linhas de mês + a linha Total mesmo sem shows", () => {
    const csv = gigSeasonalityToCsv(gigSeasonality([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(GIG_SEASONALITY_CSV_HEADERS.join(";"));
    // cabeçalho + 12 meses + Total
    expect(lines).toHaveLength(14);
    expect(lines[1].startsWith("Janeiro;0;")).toBe(true);
    expect(lines[12].startsWith("Dezembro;0;")).toBe(true);
    // 7ª coluna "Destaque" em branco (sem shows, nenhum mês é destaque).
    expect(lines[13]).toBe("Total;0;0,00;0,00;;;");
  });

  it("serializa contagem, cachê médio, faturamento e participações por mês", () => {
    const season = gigSeasonality(
      [
        gig({ date: "2024-03-01T00:00:00.000Z", fee: 100000 }),
        gig({ date: "2023-03-20T00:00:00.000Z", fee: 300000 }), // mesmo balde "Março"
        gig({ date: "2024-07-04T00:00:00.000Z", fee: 200000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = gigSeasonalityToCsv(season).split("\r\n");
    const março = lines[3].split(";");
    expect(março[0]).toBe("Março");
    expect(março[1]).toBe("2"); // dois shows somados entre anos
    expect(março[2]).toBe("2000,00"); // cachê médio = (1000+3000)/2
    expect(março[3]).toBe("4000,00"); // faturamento do mês
    expect(março[4]).toBe("67%"); // 2 de 3 shows
    expect(março[5]).toBe("67%"); // 4000 de 6000
    // Linha Total: shares em branco (sempre 100% por construção).
    const total = lines[13].split(";");
    expect(total[0]).toBe("Total");
    expect(total[1]).toBe("3");
    expect(total[3]).toBe("6000,00");
    expect(total[4]).toBe("");
    expect(total[5]).toBe("");
  });

  it("registra 0 e 0,00 nos meses sem shows (não usa o '—' da UI)", () => {
    const season = gigSeasonality([gig({ date: "2024-03-01T00:00:00.000Z" })], {
      now: NOW,
    });
    const janeiro = gigSeasonalityToCsv(season).split("\r\n")[1].split(";");
    expect(janeiro).toEqual(["Janeiro", "0", "0,00", "0,00", "0%", "0%", ""]);
  });

  it("flag na coluna 'Destaque' os papéis de cada mês (mais cheio / faturamento / cachê / fraco)", () => {
    // Março: 2 shows, maior contagem → mais cheio; também maior faturamento total.
    // Julho: 1 show de cachê alto → melhor cachê médio.
    // Novembro: 1 show de cachê baixo → menos shows entre os ativos → mais fraco.
    const season = gigSeasonality(
      [
        gig({ date: "2024-03-01T00:00:00.000Z", fee: 300000 }),
        gig({ date: "2023-03-20T00:00:00.000Z", fee: 300000 }),
        gig({ date: "2024-07-04T00:00:00.000Z", fee: 500000 }),
        gig({ date: "2024-11-04T00:00:00.000Z", fee: 100000 }),
      ],
      { now: new Date(NOW) },
    );
    const rows = gigSeasonalityToCsv(season).split("\r\n");
    const cell = (monthIndex: number) => rows[monthIndex].split(";")[6];
    expect(cell(3)).toBe("Mês mais cheio / Mais faturamento"); // Março
    expect(cell(7)).toBe("Melhor cachê médio"); // Julho
    expect(cell(11)).toBe("Mês mais fraco"); // Novembro
    expect(cell(1)).toBe(""); // Janeiro vazio, sem destaque
    // Total sem destaque.
    expect(rows[13].split(";")[6]).toBe("");
  });

  it("suprime 'Mês mais fraco' quando o único mês ativo é também o mais cheio", () => {
    const season = gigSeasonality(
      [gig({ date: "2024-05-01T00:00:00.000Z", fee: 100000 })],
      { now: new Date(NOW) },
    );
    const maio = gigSeasonalityToCsv(season).split("\r\n")[5].split(";");
    expect(maio[0]).toBe("Maio");
    // Único mês ativo é busiest, bestByVolume e bestByAvg — mas não "mais fraco".
    expect(maio[6]).toBe("Mês mais cheio / Mais faturamento / Melhor cachê médio");
  });
});

describe("gigSeasonalityComparisonToCsv", () => {
  // `now` fixo no futuro para que todos os shows forjados contem como realizados.
  const NOW = "2026-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2025-03-10T00:00:00.000Z",
    ...over,
  });
  // Constrói o comparativo entre um "ano corrente" e um "ano anterior" a partir
  // de duas listas de shows já separadas por período.
  const compare = (current: ReceivableShowLike[], previous: ReceivableShowLike[]) =>
    compareGigSeasonality(
      gigSeasonality(current, { now: new Date(NOW) }),
      gigSeasonality(previous, { now: new Date(NOW) }),
    );

  it("sempre emite as 12 linhas de mês + a linha Total mesmo sem shows", () => {
    const csv = gigSeasonalityComparisonToCsv(compare([], []));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(GIG_SEASONALITY_COMPARISON_CSV_HEADERS.join(";"));
    // cabeçalho + 12 meses + Total
    expect(lines).toHaveLength(14);
    // Meses sem shows nos dois anos: 0/0, deltas zerados, tendência "Estável".
    expect(lines[1]).toBe("Janeiro;0;0;0;0,00;Estável");
    expect(lines[12]).toBe("Dezembro;0;0;0;0,00;Estável");
    // Total: colunas de contagem em branco, deltas zerados, sem tendência.
    expect(lines[13]).toBe("Total;;;0;0,00;");
  });

  it("serializa contagem dos dois anos, deltas e tendência 'Subiu'", () => {
    // Março: 2 shows em 2025 (corrente) vs. 1 em 2024 (anterior) → subiu.
    const comparison = compare(
      [
        gig({ date: "2025-03-01T00:00:00.000Z", fee: 100000 }),
        gig({ date: "2025-03-20T00:00:00.000Z", fee: 200000 }),
      ],
      [gig({ date: "2024-03-15T00:00:00.000Z", fee: 100000 })],
    );
    const março = gigSeasonalityComparisonToCsv(comparison).split("\r\n")[3].split(";");
    expect(março[0]).toBe("Março");
    expect(março[1]).toBe("1"); // shows do ano anterior
    expect(março[2]).toBe("2"); // shows do ano corrente
    expect(março[3]).toBe("+1"); // Δ shows assinado (2 - 1)
    expect(março[5]).toBe("Subiu");
  });

  it("emite o Δ shows assinado corretamente e a linha Total agregada", () => {
    const comparison = compare(
      [
        gig({ date: "2025-03-01T00:00:00.000Z", fee: 300000 }),
        gig({ date: "2025-03-20T00:00:00.000Z", fee: 300000 }),
      ],
      [gig({ date: "2024-03-15T00:00:00.000Z", fee: 100000 })],
    );
    const lines = gigSeasonalityComparisonToCsv(comparison).split("\r\n");
    const março = lines[3].split(";");
    expect(março[3]).toBe("+1"); // 2 - 1
    expect(março[4]).toBe("5000,00"); // 6000 - 1000
    const total = lines[13].split(";");
    expect(total).toEqual(["Total", "", "", "+1", "5000,00", ""]);
  });

  it("registra deltas negativos com sinal e tendência 'Caiu'", () => {
    // Julho caiu de 2 shows (anterior) para 1 (corrente): Δ shows -1, faturamento menor.
    const comparison = compare(
      [gig({ date: "2025-07-04T00:00:00.000Z", fee: 100000 })],
      [
        gig({ date: "2024-07-04T00:00:00.000Z", fee: 200000 }),
        gig({ date: "2024-07-20T00:00:00.000Z", fee: 200000 }),
      ],
    );
    const julho = gigSeasonalityComparisonToCsv(comparison).split("\r\n")[7].split(";");
    expect(julho[0]).toBe("Julho");
    expect(julho[3]).toBe("-1"); // 1 - 2
    expect(julho[4]).toBe("-3000,00"); // 1000 - 4000
    expect(julho[5]).toBe("Caiu");
    // Total também negativo.
    const total = gigSeasonalityComparisonToCsv(comparison).split("\r\n")[13].split(";");
    expect(total[3]).toBe("-1");
    expect(total[4]).toBe("-3000,00");
  });
});

describe("gigSeasonalityStallToCsv", () => {
  // "now" em junho/2027: a janela à frente cobre jul→out; setembro (mês 8) fica
  // 3 meses à frente e a ocorrência-alvo é 2027 (mesma montagem de finance.test).
  const now = new Date("2027-06-15T12:00:00.000Z");

  function gig(partial: Partial<ReceivableShowLike>): ReceivableShowLike {
    return {
      id: "g1",
      fee: 500_00,
      status: "PLAYED",
      date: "2026-09-10T20:00:00.000Z",
      ...partial,
    };
  }

  // Histórico com setembro E março fortes (6 shows/ano cada em 2025 e 2026): a
  // participação de setembro no faturamento fica em 0,5 → lift 6× (feeShare×12).
  const strongHistory: ReceivableShowLike[] = [];
  for (const y of [2025, 2026]) {
    for (let i = 0; i < 6; i++) {
      strongHistory.push(gig({ id: `set-${y}-${i}`, date: `${y}-09-10T20:00:00.000Z` }));
      strongHistory.push(gig({ id: `mar-${y}-${i}`, date: `${y}-03-10T20:00:00.000Z` }));
    }
  }

  function stallFrom(extra: ReceivableShowLike[]) {
    const shows = [...strongHistory, ...extra];
    return gigSeasonalityStall(gigSeasonality(shows, { now }), shows, { now });
  }

  it("traz só o cabeçalho quando não há mês forte à frente (sem stall)", () => {
    // Só 3 shows de setembro → amostra abaixo do mínimo → stall.month é null.
    const shows = [
      gig({ id: "a", date: "2026-09-10T20:00:00.000Z" }),
      gig({ id: "b", date: "2026-09-11T20:00:00.000Z" }),
      gig({ id: "c", date: "2026-09-12T20:00:00.000Z" }),
    ];
    const stall = gigSeasonalityStall(gigSeasonality(shows, { now }), shows, { now });
    expect(stall.month).toBeNull();
    const lines = gigSeasonalityStallToCsv(stall).split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(GIG_SEASONALITY_STALL_CSV_HEADERS.join(";"));
  });

  it("serializa o mês forte com o recorte firme × tentativo da agenda", () => {
    // 2027/setembro: 1 CONFIRMADO + 1 PROPOSTO → booked 2 (< 6×0.5=3, dispara),
    // dos quais 1 firme e 1 tentativo. Baseline 6, shortfall 1−2/6=67%, lift 6×.
    const stall = stallFrom([
      gig({ id: "b1", date: "2027-09-05T20:00:00.000Z", status: "CONFIRMED" }),
      gig({ id: "p1", date: "2027-09-20T20:00:00.000Z", status: "PROPOSED" }),
    ]);
    expect(stall.show).toBe(true);
    const lines = gigSeasonalityStallToCsv(stall).split("\r\n");
    expect(lines[0]).toBe("Indicador;Valor");
    expect(lines[1]).toBe("Mês forte;Setembro");
    expect(lines[2]).toBe("Meses à frente;3");
    expect(lines[3]).toBe("Ritmo típico (shows/ano);6,0");
    expect(lines[4]).toBe("Shows marcados;2");
    expect(lines[5]).toBe("Firmes (confirmado/realizado);1");
    expect(lines[6]).toBe("Propostas em aberto;1");
    expect(lines[7]).toBe("Abaixo do ritmo típico (%);67%");
    expect(lines[8]).toBe("Faturamento acima da média (%);500%");
    expect(lines).toHaveLength(9);
  });

  it("registra 0 firmes quando a agenda marcada é só de propostas em aberto", () => {
    const stall = stallFrom([
      gig({ id: "p1", date: "2027-09-05T20:00:00.000Z", status: "PROPOSED" }),
      gig({ id: "p2", date: "2027-09-20T20:00:00.000Z", status: "PROPOSED" }),
    ]);
    const lines = gigSeasonalityStallToCsv(stall).split("\r\n");
    expect(lines[4]).toBe("Shows marcados;2");
    expect(lines[5]).toBe("Firmes (confirmado/realizado);0");
    expect(lines[6]).toBe("Propostas em aberto;2");
  });
});

describe("weekdayPerformanceComparisonToCsv", () => {
  // `now` fixo no futuro para que todos os shows forjados contem como realizados.
  const NOW = "2027-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    // 2026-03-06 é sexta-feira (weekday 5).
    date: "2026-03-06T00:00:00.000Z",
    ...over,
  });
  const compare = (current: ReceivableShowLike[], previous: ReceivableShowLike[]) =>
    compareWeekdayPerformance(
      weekdayPerformance(current, { now: new Date(NOW) }),
      weekdayPerformance(previous, { now: new Date(NOW) }),
    );

  it("sempre emite as 7 linhas de dia + a linha Total mesmo sem shows", () => {
    const csv = weekdayPerformanceComparisonToCsv(compare([], []));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(WEEKDAY_PERFORMANCE_COMPARISON_CSV_HEADERS.join(";"));
    // cabeçalho + 7 dias + Total
    expect(lines).toHaveLength(9);
    // Dias sem shows nos dois anos: 0/0, deltas zerados, tendência "Estável".
    expect(lines[1]).toBe("Domingo;0;0;0;0,00;Estável");
    expect(lines[7]).toBe("Sábado;0;0;0;0,00;Estável");
    // Total: colunas de contagem em branco, deltas zerados, sem tendência.
    expect(lines[8]).toBe("Total;;;0;0,00;");
  });

  it("serializa contagem dos dois anos, deltas e tendência 'Subiu'", () => {
    // Sexta (linha 6): 2 shows em 2026 (corrente) vs. 1 em 2025 (anterior) → subiu.
    const comparison = compare(
      [
        gig({ date: "2026-03-06T00:00:00.000Z", fee: 100000 }),
        gig({ date: "2026-03-20T00:00:00.000Z", fee: 200000 }),
      ],
      [gig({ date: "2025-03-07T00:00:00.000Z", fee: 100000 })],
    );
    const sexta = weekdayPerformanceComparisonToCsv(comparison).split("\r\n")[6].split(";");
    expect(sexta[0]).toBe("Sexta");
    expect(sexta[1]).toBe("1"); // shows do ano anterior
    expect(sexta[2]).toBe("2"); // shows do ano corrente
    expect(sexta[3]).toBe("+1"); // Δ shows assinado (2 - 1)
    expect(sexta[4]).toBe("2000,00"); // 3000 - 1000
    expect(sexta[5]).toBe("Subiu");
    const total = weekdayPerformanceComparisonToCsv(comparison).split("\r\n")[8].split(";");
    expect(total).toEqual(["Total", "", "", "+1", "2000,00", ""]);
  });

  it("registra deltas negativos com sinal e tendência 'Caiu'", () => {
    // Domingo (linha 1) caiu de 2 shows (anterior) para 1 (corrente).
    // 2026-03-01 e 2025-03-02/2025-03-09 são domingos.
    const comparison = compare(
      [gig({ date: "2026-03-01T00:00:00.000Z", fee: 100000 })],
      [
        gig({ date: "2025-03-02T00:00:00.000Z", fee: 200000 }),
        gig({ date: "2025-03-09T00:00:00.000Z", fee: 200000 }),
      ],
    );
    const domingo = weekdayPerformanceComparisonToCsv(comparison).split("\r\n")[1].split(";");
    expect(domingo[0]).toBe("Domingo");
    expect(domingo[3]).toBe("-1"); // 1 - 2
    expect(domingo[4]).toBe("-3000,00"); // 1000 - 4000
    expect(domingo[5]).toBe("Caiu");
  });
});

describe("monthlySeasonalityToCsv", () => {
  const tx = (over: Partial<TxLike> = {}): TxLike => ({
    type: "INCOME",
    amount: 100000,
    category: "",
    date: "2024-03-10T00:00:00.000Z",
    received: true,
    showId: null,
    ...over,
  });

  it("sempre emite as 12 linhas de mês + a linha Total mesmo sem transações", () => {
    const csv = monthlySeasonalityToCsv(monthlySeasonality([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(MONTHLY_SEASONALITY_CSV_HEADERS.join(";"));
    // cabeçalho + 12 meses + Total
    expect(lines).toHaveLength(14);
    // Sem movimento nenhum mês é destaque (7ª coluna em branco).
    expect(lines[1]).toBe("Janeiro;0,00;0,00;0,00;0;");
    expect(lines[12]).toBe("Dezembro;0,00;0,00;0,00;0;");
    // Total = ano típico composto (zerado) + amplitude do histórico (0 anos).
    expect(lines[13]).toBe("Total;0,00;0,00;0,00;0;");
  });

  it("serializa a média por ano-ativo (receita/despesa/resultado) por mês + Total composto", () => {
    const seasonality = monthlySeasonality([
      tx({ date: "2024-03-01T00:00:00.000Z", type: "INCOME", amount: 100000 }),
      tx({ date: "2023-03-20T00:00:00.000Z", type: "INCOME", amount: 300000 }),
      tx({ date: "2024-03-15T00:00:00.000Z", type: "EXPENSE", amount: 50000 }),
    ]);
    const lines = monthlySeasonalityToCsv(seasonality).split("\r\n");
    const março = lines[3].split(";");
    expect(março[0]).toBe("Março");
    // Receita média = (1000 + 3000) / 2 anos ativos = 2000.
    expect(março[1]).toBe("2000,00");
    // Despesa média = 500 / 2 anos ativos = 250.
    expect(março[2]).toBe("250,00");
    // Resultado médio = 2000 − 250 = 1750.
    expect(março[3]).toBe("1750,00");
    expect(março[4]).toBe("2"); // dois anos com movimento em março
    // Total: ano típico composto (soma das médias) + amplitude do histórico.
    // Destaque do Total sempre em branco.
    const total = lines[13].split(";");
    expect(total).toEqual(["Total", "2000,00", "250,00", "1750,00", "2", ""]);
  });

  it("registra 0,00 e 0 nos meses sem movimento (não usa o '—' da UI)", () => {
    const seasonality = monthlySeasonality([
      tx({ date: "2024-03-01T00:00:00.000Z", amount: 100000 }),
    ]);
    const janeiro = monthlySeasonalityToCsv(seasonality).split("\r\n")[1].split(";");
    // Sem movimento em janeiro: destaque em branco (7ª coluna).
    expect(janeiro).toEqual(["Janeiro", "0,00", "0,00", "0,00", "0", ""]);
  });

  it("marca na coluna Destaque o melhor mês típico e o mais fraco (por resultado médio)", () => {
    // Março rende +1000 (melhor), agosto -500 (mais fraco), maio +200 (nenhum).
    const seasonality = monthlySeasonality([
      tx({ date: "2024-03-10T00:00:00.000Z", type: "INCOME", amount: 100000 }),
      tx({ date: "2024-05-10T00:00:00.000Z", type: "INCOME", amount: 20000 }),
      tx({ date: "2024-08-10T00:00:00.000Z", type: "EXPENSE", amount: 50000 }),
    ]);
    const lines = monthlySeasonalityToCsv(seasonality).split("\r\n");
    expect(lines[3].split(";")[5]).toBe("Melhor mês típico"); // março
    expect(lines[5].split(";")[5]).toBe(""); // maio, no meio
    expect(lines[8].split(";")[5]).toBe("Mês mais fraco"); // agosto
  });

  it("com um só mês ativo, 'Melhor mês típico' vence (suprime 'Mês mais fraco')", () => {
    // Só março tem movimento: best === worst; vence o melhor.
    const seasonality = monthlySeasonality([
      tx({ date: "2024-03-10T00:00:00.000Z", type: "INCOME", amount: 100000 }),
    ]);
    const março = monthlySeasonalityToCsv(seasonality).split("\r\n")[3].split(";");
    expect(março[0]).toBe("Março");
    expect(março[5]).toBe("Melhor mês típico");
  });
});

describe("taxReserveToCsv", () => {
  const tx = (over: Partial<TxLike> = {}): TxLike => ({
    type: "INCOME",
    amount: 100000,
    category: "",
    date: "2024-03-10T00:00:00.000Z",
    received: true,
    showId: null,
    ...over,
  });

  it("sempre emite as 12 linhas de mês + a linha Total mesmo sem receita", () => {
    const csv = taxReserveToCsv(taxReserve([], { year: 2024 }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(TAX_RESERVE_CSV_HEADERS.join(";"));
    // cabeçalho + 12 meses + Total
    expect(lines).toHaveLength(14);
    expect(lines[1]).toBe("Janeiro;0,00;0,00;0%");
    expect(lines[12]).toBe("Dezembro;0,00;0,00;0%");
    // Total sem movimento: recebido e reserva zerados, participação em branco.
    expect(lines[13]).toBe("Total;0,00;0,00;");
  });

  it("serializa recebido, reserva (round × alíquota) e participação por mês + Total", () => {
    const report = taxReserve(
      [
        tx({ date: "2024-03-10T00:00:00.000Z", amount: 100000 }), // 1000 em março
        tx({ date: "2024-07-10T00:00:00.000Z", amount: 300000 }), // 3000 em julho
      ],
      { year: 2024, rate: 0.1 }, // 10%
    );
    const lines = taxReserveToCsv(report).split("\r\n");
    // Março: recebido 1000, reserva 100, participação 100/400 = 25%.
    expect(lines[3].split(";")).toEqual(["Março", "1000,00", "100,00", "25%"]);
    // Julho: recebido 3000, reserva 300, participação 300/400 = 75%.
    expect(lines[7].split(";")).toEqual(["Julho", "3000,00", "300,00", "75%"]);
    // Total: recebido 4000, reserva 400, participação em branco (100% por construção).
    expect(lines[13].split(";")).toEqual(["Total", "4000,00", "400,00", ""]);
  });

  it("ignora receitas a receber, despesas e outros anos (só caixa recebido do ano)", () => {
    const report = taxReserve(
      [
        tx({ date: "2024-03-10T00:00:00.000Z", amount: 100000, received: true }),
        tx({ date: "2024-04-10T00:00:00.000Z", amount: 500000, received: false }), // a receber
        tx({ date: "2024-05-10T00:00:00.000Z", amount: 200000, type: "EXPENSE" }), // despesa
        tx({ date: "2023-03-10T00:00:00.000Z", amount: 900000, received: true }), // outro ano
      ],
      { year: 2024, rate: DEFAULT_TAX_RATE },
    );
    const lines = taxReserveToCsv(report).split("\r\n");
    // Só o show de março de 2024 entra: 1000 × 6% = 60.
    expect(lines[3].split(";")).toEqual(["Março", "1000,00", "60,00", "100%"]);
    expect(lines[13].split(";")).toEqual(["Total", "1000,00", "60,00", ""]);
  });

  it("registra 0,00 nos meses sem receita (não usa o '—' da UI)", () => {
    const report = taxReserve([tx({ date: "2024-03-10T00:00:00.000Z" })], { year: 2024 });
    const janeiro = taxReserveToCsv(report).split("\r\n")[1].split(";");
    expect(janeiro).toEqual(["Janeiro", "0,00", "0,00", "0%"]);
  });
});

describe("weekdayPerformanceToCsv", () => {
  // `now` fixo no futuro para que todos os shows forjados contem como realizados.
  const NOW = "2025-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2024-03-10T00:00:00.000Z", // domingo (UTC)
    ...over,
  });

  it("sempre emite os 7 dias (domingo→sábado) + a linha Total mesmo sem shows", () => {
    const csv = weekdayPerformanceToCsv(weekdayPerformance([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(WEEKDAY_PERFORMANCE_CSV_HEADERS.join(";"));
    // cabeçalho + 7 dias + Total
    expect(lines).toHaveLength(9);
    expect(lines[1].startsWith("Domingo;0;")).toBe(true);
    expect(lines[7].startsWith("Sábado;0;")).toBe(true);
    // 7ª coluna "Destaque" em branco (sem shows, nenhum dia é destaque).
    expect(lines[8]).toBe("Total;0;0,00;0,00;;;");
  });

  it("serializa contagem, cachê médio, faturamento e participações por dia", () => {
    const wp = weekdayPerformance(
      [
        gig({ date: "2024-03-10T00:00:00.000Z", fee: 100000 }), // domingo
        gig({ date: "2023-03-05T00:00:00.000Z", fee: 300000 }), // domingo (outro ano)
        gig({ date: "2024-07-04T00:00:00.000Z", fee: 200000 }), // quinta
      ],
      { now: new Date(NOW) },
    );
    const lines = weekdayPerformanceToCsv(wp).split("\r\n");
    const domingo = lines[1].split(";");
    expect(domingo[0]).toBe("Domingo");
    expect(domingo[1]).toBe("2"); // dois shows somados entre anos
    expect(domingo[2]).toBe("2000,00"); // cachê médio = (1000+3000)/2
    expect(domingo[3]).toBe("4000,00"); // faturamento do dia
    expect(domingo[4]).toBe("67%"); // 2 de 3 shows
    expect(domingo[5]).toBe("67%"); // 4000 de 6000
    // Linha Total: shares em branco (sempre 100% por construção).
    const total = lines[8].split(";");
    expect(total[0]).toBe("Total");
    expect(total[1]).toBe("3");
    expect(total[3]).toBe("6000,00");
    expect(total[4]).toBe("");
    expect(total[5]).toBe("");
  });

  it("registra 0 e 0,00 nos dias sem shows (não usa o '—' da UI)", () => {
    // Único show numa sexta-feira: domingo deve sair zerado.
    const wp = weekdayPerformance(
      [gig({ date: "2024-03-01T00:00:00.000Z" })],
      { now: new Date(NOW) },
    );
    const domingo = weekdayPerformanceToCsv(wp).split("\r\n")[1].split(";");
    expect(domingo).toEqual(["Domingo", "0", "0,00", "0,00", "0%", "0%", ""]);
  });

  it("flag na coluna 'Destaque' os papéis de cada dia (mais cheio / faturamento / cachê)", () => {
    // Domingo: 2 shows (mais cheio), faturamento 4000.
    // Quinta: 1 show de cachê alto (5000) → maior faturamento e melhor cachê médio.
    const wp = weekdayPerformance(
      [
        gig({ date: "2024-03-10T00:00:00.000Z", fee: 100000 }), // domingo
        gig({ date: "2023-03-05T00:00:00.000Z", fee: 300000 }), // domingo (outro ano)
        gig({ date: "2024-07-04T00:00:00.000Z", fee: 500000 }), // quinta
      ],
      { now: new Date(NOW) },
    );
    const rows = weekdayPerformanceToCsv(wp).split("\r\n");
    const cell = (weekdayIndex: number) => rows[weekdayIndex + 1].split(";")[6];
    expect(cell(0)).toBe("Dia mais cheio"); // Domingo (mais shows)
    expect(cell(4)).toBe("Mais faturamento / Melhor cachê médio"); // Quinta
    expect(cell(1)).toBe(""); // Segunda vazia, sem destaque
    // Total sem destaque.
    expect(rows[8].split(";")[6]).toBe("");
  });

  it("acumula os três papéis no único dia ativo", () => {
    const wp = weekdayPerformance(
      [gig({ date: "2024-03-13T00:00:00.000Z", fee: 100000 })], // quarta
      { now: new Date(NOW) },
    );
    const quarta = weekdayPerformanceToCsv(wp).split("\r\n")[4].split(";");
    expect(quarta[0]).toBe("Quarta");
    expect(quarta[6]).toBe("Dia mais cheio / Mais faturamento / Melhor cachê médio");
  });
});

describe("feeDistributionToCsv", () => {
  // `now` fixo no futuro para que todos os shows forjados contem como realizados.
  const NOW = "2025-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2024-03-10T00:00:00.000Z",
    ...over,
  });

  it("sempre emite as 6 faixas + a linha Total mesmo sem shows", () => {
    const csv = feeDistributionToCsv(feeDistribution([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(FEE_DISTRIBUTION_CSV_HEADERS.join(";"));
    // cabeçalho + 6 faixas + Total
    expect(lines).toHaveLength(8);
    expect(lines[1].startsWith("Até R$ 500;0;")).toBe(true);
    expect(lines[6].startsWith("Acima de R$ 5.000;0;")).toBe(true);
    expect(lines[7]).toBe("Total;0;;0,00;");
  });

  it("serializa contagem, participações e faturamento por faixa", () => {
    const dist = feeDistribution(
      [
        gig({ fee: 80000 }), // R$ 800 → "R$ 500 – 1.000"
        gig({ fee: 150000 }), // R$ 1.500 → "R$ 1.000 – 2.000"
        gig({ fee: 180000 }), // R$ 1.800 → "R$ 1.000 – 2.000"
      ],
      { now: new Date(NOW) },
    );
    const lines = feeDistributionToCsv(dist).split("\r\n");
    // Linha 3 = terceira faixa "R$ 1.000 – 2.000" (lt500, 500to1k, 1kto2k).
    const faixa1k = lines[3].split(";");
    expect(faixa1k[0]).toBe("R$ 1.000 – 2.000");
    expect(faixa1k[1]).toBe("2"); // dois shows na faixa
    expect(faixa1k[2]).toBe("67%"); // 2 de 3 shows
    expect(faixa1k[3]).toBe("3300,00"); // 1500 + 1800
    expect(faixa1k[4]).toBe("80%"); // 3300 de 4100
    // Linha Total: shares em branco (sempre 100% por construção).
    const total = lines[7].split(";");
    expect(total[0]).toBe("Total");
    expect(total[1]).toBe("3");
    expect(total[2]).toBe("");
    expect(total[3]).toBe("4100,00");
    expect(total[4]).toBe("");
  });

  it("registra 0, 0% e 0,00 nas faixas sem shows (não usa o '—' da UI)", () => {
    const dist = feeDistribution([gig({ fee: 150000 })], { now: new Date(NOW) });
    const ate500 = feeDistributionToCsv(dist).split("\r\n")[1].split(";");
    expect(ate500).toEqual(["Até R$ 500", "0", "0%", "0,00", "0%"]);
  });

  it("sem comparativo → sem coluna 'vs. {ano-1}' (5 colunas por linha)", () => {
    const dist = feeDistribution([gig({ fee: 150000 })], { now: new Date(NOW) });
    const lines = feeDistributionToCsv(dist).split("\r\n");
    expect(lines[0].split(";")).toHaveLength(FEE_DISTRIBUTION_CSV_HEADERS.length);
    expect(lines[0]).not.toContain("vs.");
  });

  it("com comparativo → coluna 'vs. {ano-1} (p.p.)' com o deslocamento por faixa", () => {
    // Atual: 2 de 4 shows na faixa premium (50%); "R$ 1.000 – 2.000" com 2 (50%).
    // Anterior: 4 de 4 em "R$ 1.000 – 2.000" (100%), 0 premium.
    const current = feeDistribution(
      [
        gig({ fee: 600000 }),
        gig({ fee: 600000 }),
        gig({ fee: 150000 }),
        gig({ fee: 150000 }),
      ],
      { now: new Date(NOW) },
    );
    const previous = feeDistribution(
      [
        gig({ fee: 150000 }),
        gig({ fee: 150000 }),
        gig({ fee: 150000 }),
        gig({ fee: 150000 }),
      ],
      { now: new Date(NOW) },
    );
    const cmp = compareFeeDistribution(current, previous);
    const lines = feeDistributionToCsv(current, undefined, cmp, 2023).split("\r\n");
    // Cabeçalho ganha a 6ª coluna.
    const header = lines[0].split(";");
    expect(header).toHaveLength(FEE_DISTRIBUTION_CSV_HEADERS.length + 1);
    expect(header[5]).toBe("vs. 2023 (p.p.)");
    // "R$ 1.000 – 2.000" (linha 3): 100% → 50% = −50 p.p.
    const mid = lines[3].split(";");
    expect(mid[0]).toBe("R$ 1.000 – 2.000");
    expect(mid[5]).toBe("-50");
    // "Acima de R$ 5.000" (linha 6): 0% → 50% = +50 p.p.
    const premium = lines[6].split(";");
    expect(premium[0]).toBe("Acima de R$ 5.000");
    expect(premium[5]).toBe("+50");
    // Linha Total: coluna vs. em branco.
    const total = lines[7].split(";");
    expect(total[0]).toBe("Total");
    expect(total[5]).toBe("");
  });

  it("comparativo sem o ano anterior informado → coluna não aparece", () => {
    const dist = feeDistribution([gig({ fee: 150000 })], { now: new Date(NOW) });
    const cmp = compareFeeDistribution(dist, dist);
    // previousYear ausente (null) ⇒ mesmo com comparativo, sem coluna extra.
    const lines = feeDistributionToCsv(dist, undefined, cmp, null).split("\r\n");
    expect(lines[0].split(";")).toHaveLength(FEE_DISTRIBUTION_CSV_HEADERS.length);
  });
});

describe("showResultDistributionToCsv", () => {
  const played = (id: string, fee: number): ShowLike & { status: string } => ({
    id,
    fee,
    status: "PLAYED",
  });
  const expense = (showId: string, amount: number): TxLike => ({
    type: "EXPENSE",
    amount,
    category: "geral",
    date: "2026-03-10T00:00:00.000Z",
    received: true,
    showId,
  });
  const dist = (shows: (ShowLike & { status: string })[], txs: TxLike[] = []) =>
    showResultDistribution(rankShowsByProfit(shows, txs));

  it("sempre emite as 5 faixas + a linha Total mesmo sem shows", () => {
    const csv = showResultDistributionToCsv(dist([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(SHOW_RESULT_DISTRIBUTION_CSV_HEADERS.join(";"));
    // cabeçalho + 5 faixas + Total
    expect(lines).toHaveLength(7);
    expect(lines[1]).toBe("Prejuízo;0;0%;0,00");
    expect(lines[5]).toBe("Margem alta;0;0%;0,00");
    expect(lines[6]).toBe("Total;0;;0,00");
  });

  it("serializa contagem, participação e resultado por faixa", () => {
    // a: fee 100, despesa 150 -> loss -50 ; b/c: fee 100 sem despesa -> high 100 cada
    const d = dist(
      [played("a", 100_00), played("b", 100_00), played("c", 100_00)],
      [expense("a", 150_00)],
    );
    const lines = showResultDistributionToCsv(d).split("\r\n");
    const loss = lines[1].split(";");
    expect(loss[0]).toBe("Prejuízo");
    expect(loss[1]).toBe("1");
    expect(loss[2]).toBe("33%"); // 1 de 3
    expect(loss[3]).toBe("-50,00");
    const high = lines[5].split(";");
    expect(high[0]).toBe("Margem alta");
    expect(high[1]).toBe("2");
    expect(high[2]).toBe("67%"); // 2 de 3
    expect(high[3]).toBe("200,00");
  });

  it("linha Total: contagem + resultado somado, participação em branco", () => {
    const d = dist(
      [played("a", 100_00), played("b", 100_00)],
      [expense("a", 150_00)],
    );
    const total = showResultDistributionToCsv(d).split("\r\n")[6].split(";");
    expect(total[0]).toBe("Total");
    expect(total[1]).toBe("2");
    expect(total[2]).toBe(""); // 100% por construção
    expect(total[3]).toBe("50,00"); // -50 + 100
  });
});

describe("showResultDistributionComparisonToCsv", () => {
  const played = (id: string): ShowLike & { status: string } => ({
    id,
    fee: 100_00,
    status: "PLAYED",
  });
  const expense = (showId: string, amount: number): TxLike => ({
    type: "EXPENSE",
    amount,
    category: "geral",
    date: "2026-03-10T00:00:00.000Z",
    received: true,
    showId,
  });
  const dist = (shows: (ShowLike & { status: string })[], txs: TxLike[] = []) =>
    showResultDistribution(rankShowsByProfit(shows, txs));

  // Anterior: 2 de 4 no vermelho (a,b) + 2 high (c,d). Atual: 1 de 4 no vermelho
  // (a) + 3 high. A carteira melhorou (fração no vermelho caiu de 50% para 25%).
  const previous = () =>
    dist(
      [played("a"), played("b"), played("c"), played("d")],
      [expense("a", 200_00), expense("b", 200_00)],
    );
  const current = () =>
    dist(
      [played("a"), played("b"), played("c"), played("d")],
      [expense("a", 200_00)],
    );

  it("resume o comparativo em linhas de métrica + faixas + tendência", () => {
    const cmp = compareShowResultDistribution(current(), previous());
    const lines = showResultDistributionComparisonToCsv(cmp).split("\r\n");
    // Cabeçalho + shows + resultado + shows no vermelho + % vermelho + prejuízo +
    // 5 faixas + tendência = 12 linhas.
    expect(lines[0]).toBe(SHOW_RESULT_DISTRIBUTION_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(12);
    expect(lines[1].split(";")).toEqual(["Shows analisados", "4", "4", "0"]);
    // Shows no vermelho: 2 → 1, Δ -1.
    expect(lines[3].split(";")).toEqual(["Shows no vermelho", "2", "1", "-1"]);
    // No vermelho (%): 50% → 25%, Δ -25 p.p.
    expect(lines[4].split(";")).toEqual(["No vermelho (%)", "50%", "25%", "-25"]);
    // Faixa "Prejuízo" (1ª faixa, linha 6): 50% → 25% = -25 p.p.
    expect(lines[6].split(";")).toEqual(["Participação — Prejuízo (%)", "50%", "25%", "-25"]);
    // Última linha: veredito na coluna de variação.
    expect(lines[11].split(";")).toEqual(["Tendência", "", "", "Carteira mais saudável"]);
  });

  it("veredito 'Mais shows no vermelho' quando a fração sobe além do limiar", () => {
    // Inverte os papéis: o atual é o de mais prejuízo.
    const cmp = compareShowResultDistribution(previous(), current());
    const lines = showResultDistributionComparisonToCsv(cmp).split("\r\n");
    expect(lines[4].split(";")).toEqual(["No vermelho (%)", "25%", "50%", "+25"]);
    expect(lines[11].split(";")).toEqual(["Tendência", "", "", "Mais shows no vermelho"]);
  });

  it("veredito 'Estável' quando a fração no vermelho não se move além do limiar", () => {
    const cmp = compareShowResultDistribution(current(), current());
    const lines = showResultDistributionComparisonToCsv(cmp).split("\r\n");
    expect(lines[4].split(";")).toEqual(["No vermelho (%)", "25%", "25%", "0"]);
    expect(lines[11].split(";")).toEqual(["Tendência", "", "", "Estável"]);
  });

  it("dinheiro assinado nas linhas de resultado e prejuízo somados", () => {
    // Anterior: a -100 (loss), b/c/d +100 -> total 200, prejuízo -100.
    // Atual: todos +100 -> total 400, sem prejuízo.
    const prev = dist(
      [played("a"), played("b"), played("c"), played("d")],
      [expense("a", 200_00)],
    );
    const cur = dist([played("a"), played("b"), played("c"), played("d")]);
    const lines = showResultDistributionComparisonToCsv(
      compareShowResultDistribution(cur, prev),
    ).split("\r\n");
    // Resultado somado: 200 → 400, Δ +200.
    expect(lines[2].split(";")).toEqual(["Resultado somado (R$)", "200,00", "400,00", "200,00"]);
    // Prejuízo somado: -100 → 0, Δ +100.
    expect(lines[5].split(";")).toEqual(["Prejuízo somado (R$)", "-100,00", "0,00", "100,00"]);
  });
});

describe("contactMarginComparisonToCsv", () => {
  const ZE = { id: "ze", name: "Zé Produções", role: "PROMOTER" };
  const ANA = { id: "ana", name: "Ana Booking", role: "BOOKER" };
  const LIA = { id: "lia", name: "Lia Casa", role: "VENUE" };

  const reportFor = (
    shows: ShowLike[],
    payers: Record<string, { id: string; name: string; role: string } | null>,
    txs: TxLike[] = [],
  ) => rankContactsByProfit(shows, txs, (s: ShowLike) => payers[s.id] ?? null);

  const expense = (showId: string, amount: number): TxLike => ({
    type: "EXPENSE",
    amount,
    category: "geral",
    date: "2026-03-10T00:00:00.000Z",
    received: true,
    showId,
  });

  // Atual: Zé apertou (1,0 → 0,5), Ana melhorou (0,6 → 0,8); Lia só no atual.
  const current = () =>
    reportFor(
      [
        { id: "cz", fee: 100_00, status: "PLAYED" },
        { id: "ca", fee: 100_00, status: "PLAYED" },
        { id: "cl", fee: 100_00, status: "PLAYED" },
        { id: "cs", fee: 30_00, status: "PLAYED" }, // sem contratante
      ],
      { cz: ZE, ca: ANA, cl: LIA, cs: null },
      [expense("cz", 50_00), expense("ca", 20_00)],
    );
  // Anterior: Zé margem 1,0; Ana margem 0,6.
  const previous = () =>
    reportFor(
      [
        { id: "pz", fee: 100_00, status: "PLAYED" },
        { id: "pa", fee: 100_00, status: "PLAYED" },
        { id: "ps", fee: 30_00, status: "PLAYED" }, // sem contratante
      ],
      { pz: ZE, pa: ANA, ps: null },
      [expense("pa", 40_00)],
    );

  it("uma linha por contratante em comum, o maior aperto primeiro, com Δ assinado", () => {
    const cmp = compareContactMargins(current(), previous());
    const lines = contactMarginComparisonToCsv(cmp).split("\r\n");
    // Cabeçalho + Zé + Ana = 3 linhas (Lia é nova; "sem contratante" ignorado).
    expect(lines[0]).toBe(CONTACT_MARGIN_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(3);
    // Zé apertou (margem 100% → 50%, −50 p.p.; resultado 100 → 50, Δ -50).
    expect(lines[1].split(";")).toEqual([
      "Zé Produções",
      "Produtor/Promoter",
      "100%",
      "50%",
      "-50",
      "100,00",
      "50,00",
      "-50,00",
      "1",
      "1",
      "Apertou a margem",
    ]);
    // Ana ganhou (60% → 80%, +20 p.p.).
    const ana = lines[2].split(";");
    expect(ana[0]).toBe("Ana Booking");
    expect(ana[2]).toBe("60%");
    expect(ana[3]).toBe("80%");
    expect(ana[4]).toBe("+20");
    expect(ana[10]).toBe("Ganhou margem");
  });

  it("classifica 'Estável' quando a margem não se move além do limiar", () => {
    // Ambos os anos com margem idêntica para Zé.
    const same = () =>
      reportFor(
        [{ id: "z", fee: 100_00, status: "PLAYED" }],
        { z: ZE },
        [expense("z", 10_00)],
      );
    const cmp = compareContactMargins(same(), same());
    const lines = contactMarginComparisonToCsv(cmp).split("\r\n");
    expect(lines[1].split(";")[4]).toBe("0");
    expect(lines[1].split(";")[10]).toBe("Estável");
  });

  it("sem contratante em comum, só o cabeçalho (sem linhas)", () => {
    const cmp = compareContactMargins(current(), current());
    // current × current tem os mesmos contratantes → tem linhas; forjo o vazio:
    const empty = compareContactMargins(
      reportFor([{ id: "x", fee: 100_00, status: "PLAYED" }], { x: LIA }),
      reportFor([{ id: "y", fee: 100_00, status: "PLAYED" }], { y: ZE }),
    );
    expect(cmp.comparedCount).toBeGreaterThan(0);
    const lines = contactMarginComparisonToCsv(empty).split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(CONTACT_MARGIN_COMPARISON_CSV_HEADERS.join(";"));
  });
});

describe("roleMarginComparisonToCsv", () => {
  // Papéis distintos: Produtor/Promoter (PROMOTER), Contratante (BOOKER),
  // Casa de shows (VENUE). O rollup é POR PAPEL — várias casas do mesmo papel
  // caem no mesmo grupo.
  const ZE = { id: "ze", name: "Zé Produções", role: "PROMOTER" };
  const ANA = { id: "ana", name: "Ana Booking", role: "BOOKER" };
  const LIA = { id: "lia", name: "Lia Casa", role: "VENUE" };

  const reportFor = (
    shows: ShowLike[],
    payers: Record<string, { id: string; name: string; role: string } | null>,
    txs: TxLike[] = [],
  ) => rankRolesByProfit(shows, txs, (s: ShowLike) => payers[s.id] ?? null);

  const expense = (showId: string, amount: number): TxLike => ({
    type: "EXPENSE",
    amount,
    category: "geral",
    date: "2026-03-10T00:00:00.000Z",
    received: true,
    showId,
  });

  // Atual: PROMOTER apertou (1,0 → 0,5), BOOKER melhorou (0,6 → 0,8); VENUE só no atual.
  const current = () =>
    reportFor(
      [
        { id: "cz", fee: 100_00, status: "PLAYED" },
        { id: "ca", fee: 100_00, status: "PLAYED" },
        { id: "cl", fee: 100_00, status: "PLAYED" },
        { id: "cs", fee: 30_00, status: "PLAYED" }, // sem contratante (role: null)
      ],
      { cz: ZE, ca: ANA, cl: LIA, cs: null },
      [expense("cz", 50_00), expense("ca", 20_00)],
    );
  // Anterior: PROMOTER margem 1,0; BOOKER margem 0,6.
  const previous = () =>
    reportFor(
      [
        { id: "pz", fee: 100_00, status: "PLAYED" },
        { id: "pa", fee: 100_00, status: "PLAYED" },
        { id: "ps", fee: 30_00, status: "PLAYED" }, // sem contratante (role: null)
      ],
      { pz: ZE, pa: ANA, ps: null },
      [expense("pa", 40_00)],
    );

  it("uma linha por papel em comum, o maior aperto primeiro, com Δ assinado", () => {
    const cmp = compareRoleMargins(current(), previous());
    const lines = roleMarginComparisonToCsv(cmp).split("\r\n");
    // Cabeçalho + PROMOTER + BOOKER = 3 linhas (VENUE é novo; role:null ignorado).
    expect(lines[0]).toBe(ROLE_MARGIN_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(3);
    // PROMOTER apertou (margem 100% → 50%, −50 p.p.; resultado 100 → 50, Δ -50).
    expect(lines[1].split(";")).toEqual([
      "Produtor/Promoter",
      "100%",
      "50%",
      "-50",
      "100,00",
      "50,00",
      "-50,00",
      "1",
      "1",
      "Apertou a margem",
    ]);
    // BOOKER ganhou (60% → 80%, +20 p.p.).
    const booker = lines[2].split(";");
    expect(booker[0]).toBe("Contratante");
    expect(booker[1]).toBe("60%");
    expect(booker[2]).toBe("80%");
    expect(booker[3]).toBe("+20");
    expect(booker[9]).toBe("Ganhou margem");
  });

  it("classifica 'Estável' quando a margem não se move além do limiar", () => {
    // Ambos os anos com margem idêntica para PROMOTER.
    const same = () =>
      reportFor(
        [{ id: "z", fee: 100_00, status: "PLAYED" }],
        { z: ZE },
        [expense("z", 10_00)],
      );
    const cmp = compareRoleMargins(same(), same());
    const lines = roleMarginComparisonToCsv(cmp).split("\r\n");
    expect(lines[1].split(";")[3]).toBe("0");
    expect(lines[1].split(";")[9]).toBe("Estável");
  });

  it("agrega por papel: duas casas do mesmo papel entram numa linha só", () => {
    // Duas casas VENUE distintas no mesmo ano → um único grupo por papel.
    const twoVenues = (ids: [string, string]) =>
      reportFor(
        [
          { id: ids[0], fee: 100_00, status: "PLAYED" },
          { id: ids[1], fee: 100_00, status: "PLAYED" },
        ],
        {
          [ids[0]]: { id: "v1", name: "Casa 1", role: "VENUE" },
          [ids[1]]: { id: "v2", name: "Casa 2", role: "VENUE" },
        },
      );
    const cmp = compareRoleMargins(twoVenues(["a", "b"]), twoVenues(["c", "d"]));
    const lines = roleMarginComparisonToCsv(cmp).split("\r\n");
    expect(lines).toHaveLength(2); // cabeçalho + 1 papel (VENUE)
    const venue = lines[1].split(";");
    expect(venue[0]).toBe("Casa de show");
    expect(venue[7]).toBe("2"); // shows ano anterior somados no papel
    expect(venue[8]).toBe("2"); // shows ano corrente somados no papel
  });

  it("sem papel em comum, só o cabeçalho (sem linhas)", () => {
    const empty = compareRoleMargins(
      reportFor([{ id: "x", fee: 100_00, status: "PLAYED" }], { x: LIA }),
      reportFor([{ id: "y", fee: 100_00, status: "PLAYED" }], { y: ZE }),
    );
    const lines = roleMarginComparisonToCsv(empty).split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(ROLE_MARGIN_COMPARISON_CSV_HEADERS.join(";"));
  });
});

describe("feeDistributionComparisonToCsv", () => {
  // `now` fixo no futuro para que todos os shows forjados contem como realizados.
  const NOW = "2025-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2024-03-10T00:00:00.000Z",
    ...over,
  });

  // Atual: 2 shows premium (R$ 6.000) + 2 em "R$ 1.000 – 2.000" (R$ 1.500) → 4 shows,
  // mediano/médio R$ 3.750. Anterior: 4 shows em "R$ 1.000 – 2.000" → mediano/médio
  // R$ 1.500. A tabela subiu (a mediana passou de 1.500 para 3.750).
  const current = () =>
    feeDistribution(
      [gig({ fee: 600000 }), gig({ fee: 600000 }), gig({ fee: 150000 }), gig({ fee: 150000 })],
      { now: new Date(NOW) },
    );
  const previous = () =>
    feeDistribution(
      [gig({ fee: 150000 }), gig({ fee: 150000 }), gig({ fee: 150000 }), gig({ fee: 150000 })],
      { now: new Date(NOW) },
    );

  it("resume o comparativo em linhas de métrica (mediano/médio/shows/faixas) + tendência", () => {
    const cmp = compareFeeDistribution(current(), previous());
    const lines = feeDistributionComparisonToCsv(cmp).split("\r\n");
    // Cabeçalho + mediano + médio + shows + 6 faixas + tendência.
    expect(lines[0]).toBe(FEE_DISTRIBUTION_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(11);
    // Cachê mediano: 1.500 (anterior) → 3.750 (atual), Δ +2.250.
    expect(lines[1].split(";")).toEqual(["Cachê mediano (R$)", "1500,00", "3750,00", "2250,00"]);
    // Cachê médio: idêntico neste cenário.
    expect(lines[2].split(";")).toEqual(["Cachê médio (R$)", "1500,00", "3750,00", "2250,00"]);
    // Total de shows realizados: 4 → 4, sem variação.
    expect(lines[3].split(";")).toEqual(["Shows realizados", "4", "4", "0"]);
    // Faixa "R$ 1.000 – 2.000" (3ª faixa, linha 6): 100% → 50% = −50 p.p.
    expect(lines[6].split(";")).toEqual([
      "Participação — R$ 1.000 – 2.000 (%)",
      "100%",
      "50%",
      "-50",
    ]);
    // Faixa premium "Acima de R$ 5.000" (6ª faixa, linha 9): 0% → 50% = +50 p.p.
    expect(lines[9].split(";")).toEqual([
      "Participação — Acima de R$ 5.000 (%)",
      "0%",
      "50%",
      "+50",
    ]);
    // Última linha: veredito de tendência na coluna de variação.
    expect(lines[10].split(";")).toEqual(["Tendência", "", "", "Cachês em alta"]);
  });

  it("veredito 'Cachês em baixa' quando a mediana cai além do limiar (Δ negativo assinado)", () => {
    // Inverte os papéis: o ano atual é o de cachês menores.
    const cmp = compareFeeDistribution(previous(), current());
    const lines = feeDistributionComparisonToCsv(cmp).split("\r\n");
    expect(lines[1].split(";")).toEqual(["Cachê mediano (R$)", "3750,00", "1500,00", "-2250,00"]);
    expect(lines[10].split(";")).toEqual(["Tendência", "", "", "Cachês em baixa"]);
  });

  it("veredito 'Estável' e deltas zerados quando os dois anos são iguais", () => {
    const cmp = compareFeeDistribution(previous(), previous());
    const lines = feeDistributionComparisonToCsv(cmp).split("\r\n");
    expect(lines[1].split(";")).toEqual(["Cachê mediano (R$)", "1500,00", "1500,00", "0,00"]);
    // Faixa "R$ 1.000 – 2.000": 100% nos dois anos, sem deslocamento.
    expect(lines[6].split(";")).toEqual([
      "Participação — R$ 1.000 – 2.000 (%)",
      "100%",
      "100%",
      "0",
    ]);
    expect(lines[10].split(";")).toEqual(["Tendência", "", "", "Estável"]);
  });
});

describe("incomeMixToCsv", () => {
  const inc = (over: Partial<TxLike> = {}): TxLike => ({
    type: "INCOME",
    amount: 100000,
    category: "Show",
    date: "2024-03-10T00:00:00.000Z",
    received: true,
    ...over,
  });

  it("emite só o cabeçalho + a linha Total (zerada) quando não há receita", () => {
    const csv = incomeMixToCsv(incomeMix([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(INCOME_MIX_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;0,00;");
  });

  it("serializa uma linha por fonte (decrescente) + participação + Total", () => {
    const csv = incomeMixToCsv(
      incomeMix([
        inc({ category: "Show", amount: 300000 }),
        inc({ category: "Show", amount: 100000 }),
        inc({ category: "Aula", amount: 100000 }),
      ]),
    );
    const lines = csv.split("\r\n");
    // Ordem por valor: Show (4000) antes de Aula (1000).
    const show = lines[1].split(";");
    expect(show[0]).toBe("Show");
    expect(show[1]).toBe("2"); // dois lançamentos
    expect(show[2]).toBe("4000,00");
    expect(show[3]).toBe("80%"); // 4000 de 5000
    const aula = lines[2].split(";");
    expect(aula[0]).toBe("Aula");
    expect(aula[1]).toBe("1");
    expect(aula[2]).toBe("1000,00");
    expect(aula[3]).toBe("20%");
    // Total: participação em branco (sempre 100%).
    expect(lines[3]).toBe("Total;;5000,00;");
  });

  it("ignora despesas e agrupa receita sem categoria em 'Sem categoria'", () => {
    const csv = incomeMixToCsv(
      incomeMix([
        inc({ category: "", amount: 50000 }),
        inc({ type: "EXPENSE", category: "Transporte", amount: 999999 }),
      ]),
    );
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // cabeçalho + 1 fonte + Total
    const semCat = lines[1].split(";");
    expect(semCat[0]).toBe("Sem categoria");
    expect(semCat[2]).toBe("500,00");
    expect(lines[2]).toBe("Total;;500,00;");
  });
});

describe("expenseMixToCsv", () => {
  const exp = (over: Partial<TxLike> = {}): TxLike => ({
    type: "EXPENSE",
    amount: 100000,
    category: "Transporte",
    date: "2024-03-10T00:00:00.000Z",
    received: false,
    ...over,
  });

  it("emite só o cabeçalho + a linha Total (zerada) quando não há despesa", () => {
    const csv = expenseMixToCsv(expenseMix([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(EXPENSE_MIX_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;0,00;");
  });

  it("serializa uma linha por rubrica (decrescente) + participação + Total", () => {
    const csv = expenseMixToCsv(
      expenseMix([
        exp({ category: "Transporte", amount: 300000 }),
        exp({ category: "Transporte", amount: 100000 }),
        exp({ category: "Equipamento", amount: 100000 }),
      ]),
    );
    const lines = csv.split("\r\n");
    // Ordem por valor: Transporte (4000) antes de Equipamento (1000).
    const transporte = lines[1].split(";");
    expect(transporte[0]).toBe("Transporte");
    expect(transporte[1]).toBe("2"); // dois lançamentos
    expect(transporte[2]).toBe("4000,00");
    expect(transporte[3]).toBe("80%"); // 4000 de 5000
    const equip = lines[2].split(";");
    expect(equip[0]).toBe("Equipamento");
    expect(equip[1]).toBe("1");
    expect(equip[2]).toBe("1000,00");
    expect(equip[3]).toBe("20%");
    // Total: participação em branco (sempre 100%).
    expect(lines[3]).toBe("Total;;5000,00;");
  });

  it("ignora receitas e agrupa despesa sem categoria em 'Sem categoria'", () => {
    const csv = expenseMixToCsv(
      expenseMix([
        exp({ category: "", amount: 50000 }),
        exp({ type: "INCOME", category: "Show", amount: 999999 }),
      ]),
    );
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(3); // cabeçalho + 1 rubrica + Total
    const semCat = lines[1].split(";");
    expect(semCat[0]).toBe("Sem categoria");
    expect(semCat[2]).toBe("500,00");
    expect(lines[2]).toBe("Total;;500,00;");
  });
});

describe("expenseMixComparisonToCsv", () => {
  const exp = (over: Partial<TxLike> = {}): TxLike => ({
    type: "EXPENSE",
    amount: 100000,
    category: "Transporte",
    date: "2024-03-10T00:00:00.000Z",
    received: false,
    ...over,
  });

  it("emite só o cabeçalho + a linha Total (zerada) sem despesa nos dois anos", () => {
    const csv = expenseMixComparisonToCsv(
      compareExpenseMix(expenseMix([]), expenseMix([])),
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(EXPENSE_MIX_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0,00;0,00;0,00;;;");
  });

  it("serializa rubricas presentes nos dois anos (maior aumento → maior queda) com Δ e situação", () => {
    // Corrente: Transporte 4000 (subiu), Equipamento 500 (caiu).
    // Anterior: Transporte 1000, Equipamento 1500.
    const current = expenseMix([
      exp({ category: "Transporte", amount: 400000 }),
      exp({ category: "Equipamento", amount: 50000 }),
    ]);
    const previous = expenseMix([
      exp({ category: "Transporte", amount: 100000 }),
      exp({ category: "Equipamento", amount: 150000 }),
    ]);
    const lines = expenseMixComparisonToCsv(
      compareExpenseMix(current, previous),
    ).split("\r\n");
    // Transporte subiu +3000 → vem primeiro.
    const transporte = lines[1].split(";");
    expect(transporte[0]).toBe("Transporte");
    expect(transporte[1]).toBe("1000,00"); // ano anterior
    expect(transporte[2]).toBe("4000,00"); // ano corrente
    expect(transporte[3]).toBe("3000,00"); // Δ (sem "+", como o irmão de sazonalidade)
    expect(transporte[6]).toBe("Subiu");
    // Equipamento caiu -1000.
    const equip = lines[2].split(";");
    expect(equip[0]).toBe("Equipamento");
    expect(equip[3]).toBe("-1000,00"); // Δ negativo
    expect(equip[6]).toBe("Caiu");
    // Total: 2500 anterior → 4500 corrente, Δ +2000, participações em branco.
    expect(lines[3]).toBe("Total;2500,00;4500,00;2000,00;;;");
  });

  it("marca 'Estável' quando a rubrica não mudou de valor", () => {
    const mix = expenseMix([exp({ category: "Aluguel", amount: 200000 })]);
    const lines = expenseMixComparisonToCsv(compareExpenseMix(mix, mix)).split(
      "\r\n",
    );
    const aluguel = lines[1].split(";");
    expect(aluguel[3]).toBe("0,00");
    expect(aluguel[6]).toBe("Estável");
  });

  it("registra rubricas novas (ano anterior 0) e sumidas (ano corrente 0)", () => {
    const current = expenseMix([exp({ category: "Marketing", amount: 80000 })]);
    const previous = expenseMix([exp({ category: "Estúdio", amount: 120000 })]);
    const lines = expenseMixComparisonToCsv(
      compareExpenseMix(current, previous),
    ).split("\r\n");
    // Sem rubrica em comum: só bloco Novas + Sumidas + Total.
    // Nova: Marketing (só no corrente).
    const nova = lines[1].split(";");
    expect(nova[0]).toBe("Marketing");
    expect(nova[1]).toBe("0,00"); // ano anterior
    expect(nova[2]).toBe("800,00"); // ano corrente
    expect(nova[3]).toBe("800,00"); // Δ = +corrente
    expect(nova[4]).toBe("0%"); // participação anterior
    expect(nova[5]).toBe("100%"); // participação corrente
    expect(nova[6]).toBe("Nova");
    // Sumida: Estúdio (só no anterior).
    const sumida = lines[2].split(";");
    expect(sumida[0]).toBe("Estúdio");
    expect(sumida[1]).toBe("1200,00"); // ano anterior
    expect(sumida[2]).toBe("0,00"); // ano corrente
    expect(sumida[3]).toBe("-1200,00"); // Δ = -anterior
    expect(sumida[4]).toBe("100%");
    expect(sumida[5]).toBe("0%");
    expect(sumida[6]).toBe("Sumiu");
    expect(lines[3]).toBe("Total;1200,00;800,00;-400,00;;;");
  });
});

describe("incomeMixComparisonToCsv", () => {
  const inc = (over: Partial<TxLike> = {}): TxLike => ({
    type: "INCOME",
    amount: 100000,
    category: "Show",
    date: "2024-03-10T00:00:00.000Z",
    received: true,
    ...over,
  });

  it("emite só o cabeçalho + a linha Total (zerada) sem receita nos dois anos", () => {
    const csv = incomeMixComparisonToCsv(
      compareIncomeMix(incomeMix([]), incomeMix([])),
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(INCOME_MIX_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0,00;0,00;0,00;;;");
  });

  it("serializa fontes presentes nos dois anos (maior crescimento → maior queda) com Δ e situação", () => {
    // Corrente: Show 4000 (subiu), Aula 500 (caiu).
    // Anterior: Show 1000, Aula 1500.
    const current = incomeMix([
      inc({ category: "Show", amount: 400000 }),
      inc({ category: "Aula", amount: 50000 }),
    ]);
    const previous = incomeMix([
      inc({ category: "Show", amount: 100000 }),
      inc({ category: "Aula", amount: 150000 }),
    ]);
    const lines = incomeMixComparisonToCsv(
      compareIncomeMix(current, previous),
    ).split("\r\n");
    // Show subiu +3000 → vem primeiro.
    const show = lines[1].split(";");
    expect(show[0]).toBe("Show");
    expect(show[1]).toBe("1000,00"); // ano anterior
    expect(show[2]).toBe("4000,00"); // ano corrente
    expect(show[3]).toBe("3000,00"); // Δ (sem "+", como o irmão de despesa)
    expect(show[6]).toBe("Subiu");
    // Aula caiu -1000.
    const aula = lines[2].split(";");
    expect(aula[0]).toBe("Aula");
    expect(aula[3]).toBe("-1000,00"); // Δ negativo
    expect(aula[6]).toBe("Caiu");
    // Total: 2500 anterior → 4500 corrente, Δ +2000, participações em branco.
    expect(lines[3]).toBe("Total;2500,00;4500,00;2000,00;;;");
  });

  it("marca 'Estável' quando a fonte não mudou de valor", () => {
    const mix = incomeMix([inc({ category: "Streaming", amount: 200000 })]);
    const lines = incomeMixComparisonToCsv(compareIncomeMix(mix, mix)).split(
      "\r\n",
    );
    const streaming = lines[1].split(";");
    expect(streaming[3]).toBe("0,00");
    expect(streaming[6]).toBe("Estável");
  });

  it("registra fontes novas (ano anterior 0) e sumidas (ano corrente 0)", () => {
    const current = incomeMix([inc({ category: "Casamento", amount: 80000 })]);
    const previous = incomeMix([inc({ category: "Festival", amount: 120000 })]);
    const lines = incomeMixComparisonToCsv(
      compareIncomeMix(current, previous),
    ).split("\r\n");
    // Sem fonte em comum: só bloco Novas + Sumidas + Total.
    // Nova: Casamento (só no corrente).
    const nova = lines[1].split(";");
    expect(nova[0]).toBe("Casamento");
    expect(nova[1]).toBe("0,00"); // ano anterior
    expect(nova[2]).toBe("800,00"); // ano corrente
    expect(nova[3]).toBe("800,00"); // Δ = +corrente
    expect(nova[4]).toBe("0%"); // participação anterior
    expect(nova[5]).toBe("100%"); // participação corrente
    expect(nova[6]).toBe("Nova");
    // Sumida: Festival (só no anterior).
    const sumida = lines[2].split(";");
    expect(sumida[0]).toBe("Festival");
    expect(sumida[1]).toBe("1200,00"); // ano anterior
    expect(sumida[2]).toBe("0,00"); // ano corrente
    expect(sumida[3]).toBe("-1200,00"); // Δ = -anterior
    expect(sumida[4]).toBe("100%");
    expect(sumida[5]).toBe("0%");
    expect(sumida[6]).toBe("Sumiu");
    expect(lines[3]).toBe("Total;1200,00;800,00;-400,00;;;");
  });
});

describe("categoryVariationToCsv", () => {
  const tx = (over: Partial<TxLike> = {}): TxLike => ({
    type: "EXPENSE",
    amount: 100000,
    category: "Transporte",
    date: "2024-03-10T00:00:00.000Z",
    received: false,
    ...over,
  });

  it("emite só o cabeçalho + as duas linhas Total (zeradas) sem transação", () => {
    const csv = categoryVariationToCsv(compareCategoryReports([], []));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CATEGORY_VARIATION_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(3); // cabeçalho + Total despesa + Total receita
    // delta 0 (mês a mês) → "0%", não "novo".
    expect(lines[1]).toBe("Despesa;Total;0,00;0,00;0,00;0%");
    expect(lines[2]).toBe("Receita;Total;0,00;0,00;0,00;0%");
  });

  it("serializa despesas e receitas marcadas por Tipo, com variação e Totais", () => {
    const current = [
      tx({ category: "Transporte", amount: 300000 }),
      tx({ category: "Equipamento", amount: 100000 }),
      tx({ type: "INCOME", category: "Show", amount: 500000 }),
    ];
    const previous = [
      tx({ category: "Transporte", amount: 100000 }),
      tx({ type: "INCOME", category: "Show", amount: 400000 }),
    ];
    const csv = categoryVariationToCsv(compareCategoryReports(current, previous));
    const lines = csv.split("\r\n");

    // Despesas primeiro, ordenadas pelo maior movimento absoluto.
    expect(lines[1]).toBe("Despesa;Transporte;1000,00;3000,00;2000,00;+200%");
    // Equipamento não existia no mês anterior → previousAmount 0, pct "novo".
    expect(lines[2]).toBe("Despesa;Equipamento;0,00;1000,00;1000,00;novo");
    // Total das despesas: 1000 → 4000 (+300%).
    expect(lines[3]).toBe("Despesa;Total;1000,00;4000,00;3000,00;+300%");
    // Depois as receitas + seu Total.
    expect(lines[4]).toBe("Receita;Show;4000,00;5000,00;1000,00;+25%");
    expect(lines[5]).toBe("Receita;Total;4000,00;5000,00;1000,00;+25%");
  });

  it("registra quedas com porcentagem negativa e categoria que sumiu como queda de 100%", () => {
    const current = [tx({ category: "Marketing", amount: 70000 })];
    const previous = [
      tx({ category: "Marketing", amount: 100000 }),
      tx({ category: "Estúdio", amount: 50000 }),
    ];
    const csv = categoryVariationToCsv(compareCategoryReports(current, previous));
    const lines = csv.split("\r\n");
    // Estúdio sumiu (500 → 0): maior movimento absoluto, vem primeiro, −100%.
    expect(lines[1]).toBe("Despesa;Estúdio;500,00;0,00;-500,00;-100%");
    // Marketing caiu de 1000 para 700 (−30%).
    expect(lines[2]).toBe("Despesa;Marketing;1000,00;700,00;-300,00;-30%");
    // Total das despesas: 1500 → 700 (−53%).
    expect(lines[3]).toBe("Despesa;Total;1500,00;700,00;-800,00;-53%");
  });
});

describe("gigCadenceToCsv", () => {
  // `now` fixo no futuro para que os shows forjados contem como realizados.
  const NOW = "2027-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2026-03-10T00:00:00.000Z",
    ...over,
  });

  it("só cabeçalho + Total zerado quando não há shows realizados", () => {
    const csv = gigCadenceToCsv(gigCadence([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(GIG_CADENCE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0");
  });

  it("uma linha por mês ativo (chave ISO, ordem cronológica) + Total", () => {
    const cadence = gigCadence(
      [
        gig({ id: "a", date: "2026-01-05T00:00:00.000Z" }),
        gig({ id: "b", date: "2026-01-20T00:00:00.000Z" }),
        gig({ id: "c", date: "2026-03-02T00:00:00.000Z" }),
      ],
      { now: new Date(NOW) },
    );
    const lines = gigCadenceToCsv(cadence).split("\r\n");
    // cabeçalho + 2 meses ativos (jan, mar) + Total — fev parado não vira linha.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("2026-01;2");
    expect(lines[2]).toBe("2026-03;1");
    expect(lines[3]).toBe("Total;3");
  });

  it("ignora propostos/cancelados/futuros (só shows realizados)", () => {
    const cadence = gigCadence(
      [
        gig({ id: "ok", date: "2026-02-10T00:00:00.000Z" }),
        gig({ id: "prop", date: "2026-02-12T00:00:00.000Z", status: "PROPOSED" }),
        gig({ id: "canc", date: "2026-02-14T00:00:00.000Z", status: "CANCELLED" }),
        gig({ id: "fut", date: "2099-02-14T00:00:00.000Z", status: "CONFIRMED" }),
      ],
      { now: new Date(NOW) },
    );
    const lines = gigCadenceToCsv(cadence).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2026-02;1");
    expect(lines[2]).toBe("Total;1");
  });
});

describe("showGapsToCsv", () => {
  const NOW = "2026-06-15T12:00:00.000Z";
  const g = (date: string, status: string = "PLAYED") => ({ date, status });

  it("só cabeçalho quando não há hiatos", () => {
    const csv = showGapsToCsv(showGaps([g("2026-06-05")], { now: NOW }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(SHOW_GAPS_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(1);
  });

  it("uma linha por hiato, do maior ao menor, com dias ISO", () => {
    const report = showGaps(
      [g("2026-01-01"), g("2026-01-11"), g("2026-02-10")],
      { now: NOW },
    );
    const lines = showGapsToCsv(report).split("\r\n");
    expect(lines).toHaveLength(3); // cabeçalho + 2 hiatos
    expect(lines[1]).toBe("2026-01-11;2026-02-10;30");
    expect(lines[2]).toBe("2026-01-01;2026-01-11;10");
  });
});

describe("gapDistributionToCsv", () => {
  const NOW = "2026-06-15T12:00:00.000Z";
  const g = (date: string, status: string = "PLAYED") => ({ date, status });

  it("todas as 5 faixas + Total zerado quando não há hiatos", () => {
    const dist = gapDistribution(showGaps([g("2026-06-05")], { now: NOW }));
    const lines = gapDistributionToCsv(dist).split("\r\n");
    expect(lines[0]).toBe(GAP_DISTRIBUTION_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(7); // cabeçalho + 5 faixas + Total
    // Faixas sempre presentes (mesmo zeradas), da mais curta à mais longa.
    expect(lines[1]).toBe("Até 1 semana;0;0%");
    expect(lines[5]).toBe("Mais de 2 meses;0;0%");
    expect(lines[6]).toBe("Total;0;");
  });

  it("uma linha por faixa (inclusive zeradas) com contagem e participação + Total", () => {
    // Hiatos de 5, 10 e 40 dias → uma seca em três faixas distintas.
    const report = showGaps(
      [g("2026-01-01"), g("2026-01-06"), g("2026-01-16"), g("2026-02-25")],
      { now: NOW },
    );
    const lines = gapDistributionToCsv(gapDistribution(report)).split("\r\n");
    expect(lines).toHaveLength(7);
    expect(lines[1]).toBe("Até 1 semana;1;33%"); // gap de 5
    expect(lines[2]).toBe("1 a 2 semanas;1;33%"); // gap de 10
    expect(lines[3]).toBe("2 a 4 semanas;0;0%"); // vazia, não pula degrau
    expect(lines[4]).toBe("1 a 2 meses;1;33%"); // gap de 40
    expect(lines[5]).toBe("Mais de 2 meses;0;0%");
    expect(lines[6]).toBe("Total;3;"); // participação do Total em branco
  });
});

describe("feeTrendToCsv", () => {
  // `now` fixo no futuro para que os shows forjados contem como realizados.
  const NOW = "2027-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2026-03-10T00:00:00.000Z",
    ...over,
  });

  it("só cabeçalho + Total zerado quando não há shows com cachê", () => {
    const csv = feeTrendToCsv(feeTrend([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(FEE_TREND_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0,00;0,00;0,00;0");
  });

  it("uma linha por mês ativo (média/mín/máx) em ordem cronológica + Total geral", () => {
    const trend = feeTrend(
      [
        gig({ id: "a", date: "2026-01-05T00:00:00.000Z", fee: 80000 }),
        gig({ id: "b", date: "2026-01-20T00:00:00.000Z", fee: 120000 }),
        gig({ id: "c", date: "2026-03-02T00:00:00.000Z", fee: 200000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = feeTrendToCsv(trend).split("\r\n");
    // cabeçalho + 2 meses ativos (jan, mar) + Total — fev parado não vira linha.
    expect(lines).toHaveLength(4);
    // jan: média (80000+120000)/2 = 100000; faixa 80000–120000; 2 shows.
    expect(lines[1]).toBe("2026-01;1000,00;800,00;1200,00;2");
    // mar: único show de 200000.
    expect(lines[2]).toBe("2026-03;2000,00;2000,00;2000,00;1");
    // Total: média geral 400000/3 = 133333; menor 80000; maior 200000; 3 shows.
    expect(lines[3]).toBe("Total;1333,33;800,00;2000,00;3");
  });

  it("ignora propostos/cancelados/futuros/sem-cachê (só shows realizados com cachê)", () => {
    const trend = feeTrend(
      [
        gig({ id: "ok", date: "2026-02-10T00:00:00.000Z", fee: 150000 }),
        gig({ id: "prop", date: "2026-02-12T00:00:00.000Z", status: "PROPOSED" }),
        gig({ id: "canc", date: "2026-02-14T00:00:00.000Z", status: "CANCELLED" }),
        gig({ id: "fut", date: "2099-02-14T00:00:00.000Z", status: "CONFIRMED" }),
        gig({ id: "zero", date: "2026-02-16T00:00:00.000Z", fee: 0 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = feeTrendToCsv(trend).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2026-02;1500,00;1500,00;1500,00;1");
    expect(lines[2]).toBe("Total;1500,00;1500,00;1500,00;1");
  });
});

describe("feeTrendByYearToCsv", () => {
  // `now` fixo no futuro para que os shows forjados contem como realizados.
  const NOW = "2028-01-01T00:00:00.000Z";
  const gig = (
    over: Partial<ReceivableShowLike> = {},
  ): ReceivableShowLike => ({
    id: "s",
    fee: 100000,
    status: "PLAYED",
    date: "2026-03-10T00:00:00.000Z",
    ...over,
  });

  it("só cabeçalho quando não há shows com cachê (sem linha Total)", () => {
    const csv = feeTrendByYearToCsv(feeTrendByYear([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(FEE_TREND_BY_YEAR_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(1);
  });

  it("uma linha por ano ativo (média/mín/máx) em ordem cronológica, sem Total", () => {
    const byYear = feeTrendByYear(
      [
        gig({ id: "a", date: "2025-05-05T00:00:00.000Z", fee: 80000 }),
        gig({ id: "b", date: "2025-11-20T00:00:00.000Z", fee: 120000 }),
        gig({ id: "c", date: "2026-03-02T00:00:00.000Z", fee: 200000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = feeTrendByYearToCsv(byYear).split("\r\n");
    // cabeçalho + 2 anos ativos (2025, 2026) — sem linha Total.
    expect(lines).toHaveLength(3);
    // 2025: média (80000+120000)/2 = 100000; faixa 80000–120000; 2 shows.
    expect(lines[1]).toBe("2025;1000,00;800,00;1200,00;2");
    // 2026: único show de 200000.
    expect(lines[2]).toBe("2026;2000,00;2000,00;2000,00;1");
  });

  it("ignora propostos/cancelados/futuros/sem-cachê (só shows realizados com cachê)", () => {
    const byYear = feeTrendByYear(
      [
        gig({ id: "ok", date: "2026-02-10T00:00:00.000Z", fee: 150000 }),
        gig({ id: "prop", date: "2026-02-12T00:00:00.000Z", status: "PROPOSED" }),
        gig({ id: "canc", date: "2026-02-14T00:00:00.000Z", status: "CANCELLED" }),
        gig({ id: "fut", date: "2099-02-14T00:00:00.000Z", status: "CONFIRMED" }),
        gig({ id: "zero", date: "2026-02-16T00:00:00.000Z", fee: 0 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = feeTrendByYearToCsv(byYear).split("\r\n");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("2026;1500,00;1500,00;1500,00;1");
  });
});

describe("clientRetentionToCsv", () => {
  // `now` fixo no futuro para datar `lastShowDate` de forma estável.
  const NOW = "2030-01-01T00:00:00.000Z";
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });

  it("só cabeçalho + Total zerado quando não há contratantes", () => {
    const csv = clientRetentionToCsv(clientRetention<C>([], new Date(NOW)));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CLIENT_RETENTION_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    // Total zerado: cachê médio/show cai para 0,00 (guarda de divisão por zero).
    expect(lines[1]).toBe("Total;;0;0,00;0,00;;0/0");
  });

  it("uma linha por contratante (ordem shows desc) com Recorrente Sim/Não + Total", () => {
    const retention = clientRetention<C>(
      [
        item({ id: "a", name: "Bar do Zé", role: "VENUE" }, [
          { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 100000 },
          { status: "PLAYED", date: "2026-05-15T00:00:00.000Z", fee: 150000 },
        ]),
        item({ id: "b", name: "Produtora Lua", role: "PROMOTER" }, [
          { status: "PLAYED", date: "2026-03-20T00:00:00.000Z", fee: 200000 },
        ]),
      ],
      new Date(NOW),
    );
    const lines = clientRetentionToCsv(retention).split("\r\n");
    // cabeçalho + 2 contratantes (mais shows primeiro) + Total.
    expect(lines).toHaveLength(4);
    // Bar do Zé: 2 shows, 2500,00 total → 1250,00/show. Produtora Lua: 1 show → 2000,00/show.
    expect(lines[1]).toBe("Bar do Zé;Casa de show;2;2500,00;1250,00;15/05/2026;Sim");
    expect(lines[2]).toBe(
      "Produtora Lua;Produtor/Promoter;1;2000,00;2000,00;20/03/2026;Não",
    );
    // Total: 3 shows, 4500,00 → 1500,00/show; "recorrentes/total" = 1/2.
    expect(lines[3]).toBe("Total;;3;4500,00;1500,00;;1/2");
  });

  it("exclui contratantes só com shows cancelados; futuro confirmado conta para recorrência", () => {
    const retention = clientRetention<C>(
      [
        item({ id: "n", name: "Casa Nova", role: "OTHER" }, [
          { status: "PLAYED", date: "2026-01-10T00:00:00.000Z", fee: 100000 },
          { status: "CONFIRMED", date: "2099-06-01T00:00:00.000Z", fee: 300000 },
        ]),
        item({ id: "x", name: "Só Cancelado", role: "VENUE" }, [
          { status: "CANCELLED", date: "2026-04-01T00:00:00.000Z", fee: 500000 },
        ]),
      ],
      new Date(NOW),
    );
    const lines = clientRetentionToCsv(retention).split("\r\n");
    // só "Casa Nova" vira linha — o cancelado-puro fica de fora.
    expect(lines).toHaveLength(3);
    // 2 shows não cancelados, 4000,00 total → 2000,00/show (o cancelado não dilui).
    expect(lines[1]).toBe("Casa Nova;Outro;2;4000,00;2000,00;01/06/2099;Sim");
    expect(lines[2]).toBe("Total;;2;4000,00;2000,00;;1/1");
  });

  it("cachê médio/show arredonda para o centavo (divisão não exata)", () => {
    const retention = clientRetention<C>(
      [
        // 3 shows, 100,00 total → 33,3333.../show → arredonda para 33,33.
        item({ id: "r", name: "Recorrente Ímpar", role: "VENUE" }, [
          { status: "PLAYED", date: "2026-01-10T00:00:00.000Z", fee: 4000 },
          { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 3000 },
          { status: "PLAYED", date: "2026-03-10T00:00:00.000Z", fee: 3000 },
        ]),
      ],
      new Date(NOW),
    );
    const lines = clientRetentionToCsv(retention).split("\r\n");
    expect(lines[1]).toBe("Recorrente Ímpar;Casa de show;3;100,00;33,33;10/03/2026;Sim");
    expect(lines[2]).toBe("Total;;3;100,00;33,33;;1/1");
  });
});

describe("underpricedLoyalClientsToCsv", () => {
  const NOW = "2030-01-01T00:00:00.000Z";
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });

  it("só cabeçalho quando não há balcão/alvos (lista vazia)", () => {
    const csv = underpricedLoyalClientsToCsv<C>({ benchmark: 0, clients: [] });
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(UNDERPRICED_LOYAL_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(1);
  });

  it("uma linha por alvo (maior desconto primeiro) com balcão e desconto R$/%", () => {
    const retention = clientRetention<C>(
      [
        // Balcão: contratante de um show só a 2000,00 → benchmark 2000,00/show.
        item({ id: "u", name: "Único", role: "OTHER" }, [
          { status: "PLAYED", date: "2026-01-10T00:00:00.000Z", fee: 200000 },
        ]),
        // Recorrente barato: 3 shows, 3000,00 → 1000,00/show (−1000,00 = 50%).
        item({ id: "b", name: "Barato", role: "VENUE" }, [
          { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 100000 },
          { status: "PLAYED", date: "2026-03-10T00:00:00.000Z", fee: 100000 },
          { status: "PLAYED", date: "2026-04-10T00:00:00.000Z", fee: 100000 },
        ]),
        // Recorrente pouco abaixo: 2 shows, 3600,00 → 1800,00/show (−200,00 = 10%).
        item({ id: "m", name: "Meio Barato", role: "PROMOTER" }, [
          { status: "PLAYED", date: "2026-02-11T00:00:00.000Z", fee: 180000 },
          { status: "PLAYED", date: "2026-03-11T00:00:00.000Z", fee: 180000 },
        ]),
        // Recorrente no preço: 2 shows, 5000,00 → 2500,00/show (acima do balcão, fora).
        item({ id: "j", name: "Justo", role: "VENUE" }, [
          { status: "PLAYED", date: "2026-02-12T00:00:00.000Z", fee: 250000 },
          { status: "PLAYED", date: "2026-03-12T00:00:00.000Z", fee: 250000 },
        ]),
      ],
      new Date(NOW),
    );
    const underpriced = underpricedLoyalClients(retention);
    expect(underpriced).not.toBeNull();
    const lines = underpricedLoyalClientsToCsv(underpriced!).split("\r\n");
    // cabeçalho + 2 alvos (o "Justo" no preço fica de fora).
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Barato;Casa de show;3;1000,00;2000,00;1000,00;50%");
    expect(lines[2]).toBe(
      "Meio Barato;Produtor/Promoter;2;1800,00;2000,00;200,00;10%",
    );
  });
});

describe("retentionPriceMoversToCsv", () => {
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });

  const YEARS_HEADER =
    "Contratante;Papel;Movimento;Cachê/show 2025 (R$);Cachê/show 2026 (R$);" +
    "Variação (R$);Variação (%);Shows 2025;Shows 2026";

  it("só cabeçalho (rótulos genéricos) quando não há par YoY (null)", () => {
    const csv = retentionPriceMoversToCsv<C>(null);
    const lines = csv.split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(
      "Contratante;Papel;Movimento;Cachê/show ano anterior (R$);" +
        "Cachê/show ano atual (R$);Variação (R$);Variação (%);" +
        "Shows ano anterior;Shows ano atual",
    );
  });

  it("raised primeiro (maior alta) depois lowered; exclui flat e quem só tem um ano", () => {
    const items = [
      // Subiu +800,00 (+80%): entra em raised, à frente do +500,00.
      item({ id: "sm", name: "SobeMais", role: "VENUE" }, [
        { status: "PLAYED", date: "2025-03-10T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-03-10T00:00:00.000Z", fee: 180000 },
      ]),
      // Subiu +500,00 (+50%).
      item({ id: "s", name: "Sobe", role: "OTHER" }, [
        { status: "PLAYED", date: "2025-04-10T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-04-10T00:00:00.000Z", fee: 150000 },
      ]),
      // Baixou −1000,00 (−50%): entra em lowered.
      item({ id: "d", name: "Desce", role: "PROMOTER" }, [
        { status: "PLAYED", date: "2025-05-10T00:00:00.000Z", fee: 200000 },
        { status: "PLAYED", date: "2026-05-10T00:00:00.000Z", fee: 100000 },
      ]),
      // Estável (+3% < 5% do limiar): fora.
      item({ id: "e", name: "Estavel", role: "VENUE" }, [
        { status: "PLAYED", date: "2025-06-10T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-06-10T00:00:00.000Z", fee: 103000 },
      ]),
      // Só 2026 (aquisição, não mover): fora.
      item({ id: "n", name: "Novo", role: "OTHER" }, [
        { status: "PLAYED", date: "2026-07-10T00:00:00.000Z", fee: 100000 },
      ]),
    ];
    const movers = retentionPriceMovers<C>(items, 2026, 2025);
    const lines = retentionPriceMoversToCsv(movers).split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(YEARS_HEADER);
    expect(lines[1]).toBe("SobeMais;Casa de show;Subiu;1000,00;1800,00;800,00;+80;1;1");
    expect(lines[2]).toBe("Sobe;Outro;Subiu;1000,00;1500,00;500,00;+50;1;1");
    expect(lines[3]).toBe(
      "Desce;Produtor/Promoter;Baixou;2000,00;1000,00;-1000,00;-50;1;1",
    );
  });

  it("só cabeçalho (com os anos) quando o par existe mas todos ficaram estáveis", () => {
    const items = [
      item({ id: "e", name: "Estavel", role: "VENUE" }, [
        { status: "PLAYED", date: "2025-06-10T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-06-10T00:00:00.000Z", fee: 103000 },
      ]),
    ];
    const movers = retentionPriceMovers<C>(items, 2026, 2025);
    const lines = retentionPriceMoversToCsv(movers).split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(YEARS_HEADER);
  });
});

describe("clientConcentrationToCsv", () => {
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });

  it("só cabeçalho + Total zerado quando não há faturamento", () => {
    const csv = clientConcentrationToCsv(clientConcentration<C>([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CLIENT_CONCENTRATION_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;0;0,00;");
  });

  it("uma linha por contratante (cachê desc) com participação + Total", () => {
    const conc = clientConcentration<C>([
      item({ id: "a", name: "Bar do Zé", role: "VENUE" }, [
        { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 200000 },
        { status: "PLAYED", date: "2026-05-15T00:00:00.000Z", fee: 100000 },
      ]),
      item({ id: "b", name: "Produtora Lua", role: "PROMOTER" }, [
        { status: "PLAYED", date: "2026-03-20T00:00:00.000Z", fee: 100000 },
      ]),
    ]);
    const lines = clientConcentrationToCsv(conc).split("\r\n");
    // cabeçalho + 2 contratantes (maior cachê primeiro) + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Bar do Zé;Casa de show;2;3000,00;75%");
    expect(lines[2]).toBe("Produtora Lua;Produtor/Promoter;1;1000,00;25%");
    // Total: 3 shows, 4000,00; participação em branco (100% por construção).
    expect(lines[3]).toBe("Total;;3;4000,00;");
  });

  it("ignora shows cancelados e contratantes sem faturamento", () => {
    const conc = clientConcentration<C>([
      item({ id: "n", name: "Casa Nova", role: "OTHER" }, [
        { status: "PLAYED", date: "2026-01-10T00:00:00.000Z", fee: 100000 },
        { status: "CANCELLED", date: "2026-04-01T00:00:00.000Z", fee: 500000 },
      ]),
      item({ id: "x", name: "Só Cancelado", role: "VENUE" }, [
        { status: "CANCELLED", date: "2026-04-01T00:00:00.000Z", fee: 300000 },
      ]),
    ]);
    const lines = clientConcentrationToCsv(conc).split("\r\n");
    // só "Casa Nova" vira linha; o cancelado conta 0 no cachê e nos shows.
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Casa Nova;Outro;1;1000,00;100%");
    expect(lines[2]).toBe("Total;;1;1000,00;");
  });

  it("com previous+previousYear ganha coluna 'vs. {ano} (p.p.)' assinada, 'novo' e Total em branco", () => {
    const cur = clientConcentration<C>([
      // a: 800/1000 = 80%; b (novo): 200/1000 = 20%
      item({ id: "a", name: "Bar do Zé", role: "VENUE" }, [
        { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 800000 },
      ]),
      item({ id: "b", name: "Produtora Lua", role: "PROMOTER" }, [
        { status: "PLAYED", date: "2026-03-20T00:00:00.000Z", fee: 200000 },
      ]),
    ]);
    const prev = clientConcentration<C>([
      // a: 500/1000 = 50% → +30 p.p.
      item({ id: "a", name: "Bar do Zé", role: "VENUE" }, [
        { status: "PLAYED", date: "2025-02-10T00:00:00.000Z", fee: 500000 },
      ]),
      item({ id: "c", name: "Antigo", role: "OTHER" }, [
        { status: "PLAYED", date: "2025-03-20T00:00:00.000Z", fee: 500000 },
      ]),
    ]);
    const lines = clientConcentrationToCsv(cur, undefined, prev, 2025).split("\r\n");
    expect(lines[0]).toBe(
      CLIENT_CONCENTRATION_CSV_HEADERS.join(";") + ";vs. 2025 (p.p.)",
    );
    // a: 80% agora, 50% antes → +30; b só apareceu agora → "novo".
    expect(lines[1]).toBe("Bar do Zé;Casa de show;1;8000,00;80%;+30");
    expect(lines[2]).toBe("Produtora Lua;Produtor/Promoter;1;2000,00;20%;novo");
    // Total ganha coluna extra em branco.
    expect(lines[3]).toBe("Total;;2;10000,00;;");
  });

  it("sem previous a saída é byte a byte idêntica à histórica (5 colunas)", () => {
    const conc = clientConcentration<C>([
      item({ id: "a", name: "Bar do Zé", role: "VENUE" }, [
        { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 300000 },
      ]),
    ]);
    // previous sem previousYear (ou vice-versa) não ativa a coluna.
    const base = clientConcentrationToCsv(conc);
    expect(clientConcentrationToCsv(conc, undefined, conc, null)).toBe(base);
    expect(clientConcentrationToCsv(conc, undefined, null, 2025)).toBe(base);
    expect(base.split("\r\n")[0]).toBe(CLIENT_CONCENTRATION_CSV_HEADERS.join(";"));
  });
});

describe("cancellationByContactToCsv", () => {
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });

  it("só cabeçalho + Total zerado quando não há cancelamentos", () => {
    const csv = cancellationByContactToCsv(cancellationByContact<C>([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CANCELLATION_BY_CONTACT_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;0;0;0%;0,00;0 cancelaram");
  });

  it("confiáveis primeiro (apesar de taxa menor), amostra pequena e Total", () => {
    const report = cancellationByContact<C>([
      // 5 shows, 2 cancelados → taxa 40%, amostra confiável (>=3).
      item({ id: "z", name: "Bar do Zé", role: "VENUE" }, [
        { status: "PLAYED", date: "2026-01-10T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-02-10T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-03-10T00:00:00.000Z", fee: 100000 },
        { status: "CANCELLED", date: "2026-04-10T00:00:00.000Z", fee: 100000 },
        { status: "CANCELLED", date: "2026-05-10T00:00:00.000Z", fee: 100000 },
      ]),
      // 2 shows, 1 cancelado → taxa 50% (maior!), mas amostra pequena (<3).
      item({ id: "l", name: "Produtora Lua", role: "PROMOTER" }, [
        { status: "PLAYED", date: "2026-02-01T00:00:00.000Z", fee: 200000 },
        { status: "CANCELLED", date: "2026-06-01T00:00:00.000Z", fee: 300000 },
      ]),
    ]);
    const lines = cancellationByContactToCsv(report).split("\r\n");
    // cabeçalho + 2 contratantes (confiável antes do de taxa maior) + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Bar do Zé;Casa de show;2;5;40%;2000,00;Confiável");
    expect(lines[2]).toBe(
      "Produtora Lua;Produtor/Promoter;1;2;50%;3000,00;Amostra pequena",
    );
    // Total da carteira: 3 cancelados de 7 shows = 43%; 5000,00 perdidos.
    expect(lines[3]).toBe("Total;;3;7;43%;5000,00;2 cancelaram");
  });

  it("contratante sem cancelamento não vira linha, mas entra no Total (Shows)", () => {
    const report = cancellationByContact<C>([
      item({ id: "c", name: "Cancelador", role: "OTHER" }, [
        { status: "PLAYED", date: "2026-01-10T00:00:00.000Z", fee: 100000 },
        { status: "CANCELLED", date: "2026-02-10T00:00:00.000Z", fee: 400000 },
      ]),
      // 3 shows, nenhum cancelado → some nos totais, sem virar linha.
      item({ id: "f", name: "Fiel", role: "VENUE" }, [
        { status: "PLAYED", date: "2026-01-01T00:00:00.000Z", fee: 100000 },
        { status: "PLAYED", date: "2026-02-01T00:00:00.000Z", fee: 100000 },
        { status: "CONFIRMED", date: "2099-01-01T00:00:00.000Z", fee: 100000 },
      ]),
    ]);
    const lines = cancellationByContactToCsv(report).split("\r\n");
    // só "Cancelador" vira linha; o Total soma os 5 shows (2 + 3 do "Fiel").
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Cancelador;Outro;1;2;50%;4000,00;Amostra pequena");
    // Total: 1 cancelado em 5 shows = 20%; só 1 contratante cancelou.
    expect(lines[2]).toBe("Total;;1;5;20%;4000,00;1 cancelaram");
  });
});

describe("reengageToCsv", () => {
  // `now` fixo para datar a defasagem (`daysSinceLastShow`) de forma estável.
  const NOW = "2026-07-01T00:00:00.000Z";
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });

  it("só cabeçalho + Total zerado quando não há dormentes", () => {
    const csv = reengageToCsv(findContactsToReengage<C>([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(REENGAGE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;;;0;0,00");
  });

  it("uma linha por dormente (mais esquecido primeiro) + Total", () => {
    const list = findContactsToReengage<C>(
      [
        item({ id: "a", name: "Bar Velho", role: "VENUE" }, [
          { status: "PLAYED", date: "2024-06-01T00:00:00.000Z", fee: 50000 },
          { status: "PLAYED", date: "2025-01-01T00:00:00.000Z", fee: 100000 },
        ]),
        item({ id: "b", name: "Produtora Lua", role: "PROMOTER" }, [
          { status: "PLAYED", date: "2026-03-01T00:00:00.000Z", fee: 200000 },
        ]),
      ],
      { now: new Date(NOW) },
    );
    const lines = reengageToCsv(list).split("\r\n");
    // cabeçalho + 2 dormentes (maior defasagem primeiro) + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Bar Velho;Casa de show;01/01/2025;546;2;1500,00");
    expect(lines[2]).toBe("Produtora Lua;Produtor/Promoter;01/03/2026;122;1;2000,00");
    // Total: 3 shows passados, 3500,00 em cachê histórico.
    expect(lines[3]).toBe("Total;;;;3;3500,00");
  });

  it("ignora quem tem show futuro, só-cancelado ou ainda recente (< staleDays)", () => {
    const list = findContactsToReengage<C>(
      [
        // tem show futuro confirmado → não está dormente.
        item({ id: "f", name: "Tem Futuro", role: "VENUE" }, [
          { status: "PLAYED", date: "2025-01-01T00:00:00.000Z", fee: 100000 },
          { status: "CONFIRMED", date: "2099-01-01T00:00:00.000Z", fee: 300000 },
        ]),
        // só cancelado → sem histórico passado.
        item({ id: "c", name: "Só Cancelado", role: "VENUE" }, [
          { status: "CANCELLED", date: "2024-04-01T00:00:00.000Z", fee: 500000 },
        ]),
        // último show há ~16 dias → abaixo do limiar de 60.
        item({ id: "r", name: "Recente", role: "OTHER" }, [
          { status: "PLAYED", date: "2026-06-15T00:00:00.000Z", fee: 80000 },
        ]),
        // dormente de verdade.
        item({ id: "d", name: "Dormente", role: "OTHER" }, [
          { status: "PLAYED", date: "2025-12-01T00:00:00.000Z", fee: 50000 },
        ]),
      ],
      { now: new Date(NOW) },
    );
    const lines = reengageToCsv(list).split("\r\n");
    // só "Dormente" vira linha.
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Dormente;Outro;01/12/2025;212;1;500,00");
    expect(lines[2]).toBe("Total;;;;1;500,00");
  });
});

describe("citiesToReengageToCsv", () => {
  const NOW = "2026-07-01T00:00:00.000Z";
  const s = (over: Partial<CityReengageShowLike>): CityReengageShowLike => ({
    status: "PLAYED",
    city: "São Paulo",
    date: "2025-01-01T00:00:00.000Z",
    fee: 100000,
    ...over,
  });

  it("só cabeçalho + Total zerado quando não há praças", () => {
    const csv = citiesToReengageToCsv(findCitiesToReengage([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CITIES_REENGAGE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;;0;0,00");
  });

  it("uma linha por praça (mais esquecida primeiro) + Total", () => {
    const list = findCitiesToReengage(
      [
        s({ city: "São Paulo", date: "2024-06-01T00:00:00.000Z", fee: 50000 }),
        s({ city: "São Paulo", date: "2025-06-01T00:00:00.000Z", fee: 100000 }),
        s({ city: "Rio de Janeiro", date: "2026-01-01T00:00:00.000Z", fee: 200000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = citiesToReengageToCsv(list).split("\r\n");
    // cabeçalho + 2 praças (maior defasagem primeiro) + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("São Paulo;01/06/2025;395;2;1500,00");
    expect(lines[2]).toBe("Rio de Janeiro;01/01/2026;181;1;2000,00");
    // Total: 3 shows passados, 3500,00 em cachê histórico.
    expect(lines[3]).toBe("Total;;;3;3500,00");
  });

  it("ignora cidade com show futuro, só-cancelada, recente (< staleDays) ou sem cidade", () => {
    const list = findCitiesToReengage(
      [
        // tem show futuro confirmado → não está dormente.
        s({ city: "Curitiba", date: "2025-01-01T00:00:00.000Z" }),
        s({ city: "Curitiba", status: "CONFIRMED", date: "2099-01-01T00:00:00.000Z" }),
        // só cancelada → sem histórico passado.
        s({ city: "Salvador", status: "CANCELLED", date: "2024-04-01T00:00:00.000Z" }),
        // último show há ~16 dias → abaixo do limiar de 90.
        s({ city: "Recife", date: "2026-06-15T00:00:00.000Z" }),
        // sem cidade → não há praça a revisitar.
        s({ city: "", date: "2025-01-01T00:00:00.000Z" }),
        // dormente de verdade.
        s({ city: "Belo Horizonte", date: "2025-12-01T00:00:00.000Z", fee: 50000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = citiesToReengageToCsv(list).split("\r\n");
    // só "Belo Horizonte" vira linha.
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Belo Horizonte;01/12/2025;212;1;500,00");
    expect(lines[2]).toBe("Total;;;1;500,00");
  });
});

describe("venuesToReengageToCsv", () => {
  const NOW = "2026-07-01T00:00:00.000Z";
  const s = (over: Partial<VenueReengageShowLike>): VenueReengageShowLike => ({
    status: "PLAYED",
    venue: "Bar do Zé",
    date: "2025-01-01T00:00:00.000Z",
    fee: 100000,
    ...over,
  });

  it("só cabeçalho + Total zerado quando não há casas", () => {
    const csv = venuesToReengageToCsv(findVenuesToReengage([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(VENUES_REENGAGE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;;0;0,00");
  });

  it("uma linha por casa (mais esquecida primeiro) + Total", () => {
    const list = findVenuesToReengage(
      [
        s({ venue: "Bar do Zé", date: "2024-06-01T00:00:00.000Z", fee: 50000 }),
        s({ venue: "Bar do Zé", date: "2025-06-01T00:00:00.000Z", fee: 100000 }),
        s({ venue: "Circo Voador", date: "2026-01-01T00:00:00.000Z", fee: 200000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = venuesToReengageToCsv(list).split("\r\n");
    // cabeçalho + 2 casas (maior defasagem primeiro) + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Bar do Zé;01/06/2025;395;2;1500,00");
    expect(lines[2]).toBe("Circo Voador;01/01/2026;181;1;2000,00");
    expect(lines[3]).toBe("Total;;;3;3500,00");
  });

  it("ignora casa com show futuro, só-cancelada, recente (< staleDays) ou sem local", () => {
    const list = findVenuesToReengage(
      [
        // tem show futuro confirmado → não está dormente.
        s({ venue: "Teatro Guaíra", date: "2025-01-01T00:00:00.000Z" }),
        s({ venue: "Teatro Guaíra", status: "CONFIRMED", date: "2099-01-01T00:00:00.000Z" }),
        // só cancelada → sem histórico passado.
        s({ venue: "Studio SP", status: "CANCELLED", date: "2024-04-01T00:00:00.000Z" }),
        // último show há ~16 dias → abaixo do limiar de 90.
        s({ venue: "Blue Note", date: "2026-06-15T00:00:00.000Z" }),
        // sem local → não há casa a revisitar.
        s({ venue: "", date: "2025-01-01T00:00:00.000Z" }),
        // dormente de verdade.
        s({ venue: "Sesc Pompeia", date: "2025-12-01T00:00:00.000Z", fee: 50000 }),
      ],
      { now: new Date(NOW) },
    );
    const lines = venuesToReengageToCsv(list).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("Sesc Pompeia;01/12/2025;212;1;500,00");
    expect(lines[2]).toBe("Total;;;1;500,00");
  });
});

describe("yearlyHistoryToCsv", () => {
  const tx = (
    type: TxLike["type"],
    amount: number,
    date: string,
  ): TxLike => ({
    type,
    amount,
    category: "",
    date,
    received: true,
    showId: null,
  });

  it("só cabeçalho + Total zerado quando não há transações", () => {
    const csv = yearlyHistoryToCsv(yearlyHistory([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(YEARLY_HISTORY_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0,00;0,00;0,00;");
  });

  it("uma linha por ano ativo (ordem crescente) com variação do resultado + Total", () => {
    const lines = yearlyHistoryToCsv(
      yearlyHistory([
        tx("INCOME", 100000, "2024-05-10T00:00:00.000Z"),
        tx("EXPENSE", 40000, "2024-08-01T00:00:00.000Z"),
        // 2025: resultado 120000 (+100% vs. 60000 de 2024).
        tx("INCOME", 150000, "2025-03-20T00:00:00.000Z"),
        tx("EXPENSE", 30000, "2025-09-15T00:00:00.000Z"),
      ]),
    ).split("\r\n");
    // cabeçalho + 2 anos + Total.
    expect(lines).toHaveLength(4);
    // 2024: primeiro ano → sem base → variação vazia.
    expect(lines[1]).toBe("2024;1000,00;400,00;600,00;");
    // 2025: resultado 1200,00; +100% frente a 600,00.
    expect(lines[2]).toBe("2025;1500,00;300,00;1200,00;+100%");
    // Total: receitas 2500,00; despesas 700,00; resultado 1800,00; variação vazia.
    expect(lines[3]).toBe("Total;2500,00;700,00;1800,00;");
  });

  it("emite 'novo' quando o ano anterior teve resultado 0 e ignora anos sem movimento", () => {
    const lines = yearlyHistoryToCsv(
      yearlyHistory([
        // 2024: receita = despesa → resultado 0 (mas ano ativo, há movimento).
        tx("INCOME", 50000, "2024-04-10T00:00:00.000Z"),
        tx("EXPENSE", 50000, "2024-06-10T00:00:00.000Z"),
        // 2026: resultado 80000, base anterior (2024) = 0 → "novo". 2025 sem movimento some.
        tx("INCOME", 80000, "2026-02-01T00:00:00.000Z"),
      ]),
    ).split("\r\n");
    // cabeçalho + 2024 + 2026 (2025 vazio não entra) + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("2024;500,00;500,00;0,00;");
    expect(lines[2]).toBe("2026;800,00;0,00;800,00;novo");
    expect(lines[3]).toBe("Total;1300,00;500,00;800,00;");
  });
});

describe("recurringExpensesToCsv", () => {
  // `now` fixo: "ativa" = última ocorrência nos últimos 2 meses (default).
  const NOW = "2026-07-15T00:00:00.000Z";
  const tx = (amount: number, category: string, date: string): TxLike => ({
    type: "EXPENSE",
    amount,
    category,
    date,
    received: true,
    showId: null,
  });

  it("só cabeçalho + Total zerado quando não há custos recorrentes", () => {
    const csv = recurringExpensesToCsv(recurringExpenses([], { now: NOW }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(RECURRING_EXPENSES_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0,00;;;;0,00;0/0 ativas");
  });

  it("uma linha por categoria recorrente (conta típica desc) + Total com custo fixo estimado", () => {
    const lines = recurringExpensesToCsv(
      recurringExpenses(
        [
          // Sala de ensaio: abr/mai/jun → ativa (última jun, 1 mês de NOW), típico 80,00.
          tx(80_00, "Sala de ensaio", "2026-04-10T00:00:00.000Z"),
          tx(80_00, "Sala de ensaio", "2026-05-10T00:00:00.000Z"),
          tx(80_00, "Sala de ensaio", "2026-06-10T00:00:00.000Z"),
          // Plano antigo: jan/fev/mar → encerrada (última mar, 4 meses de NOW), típico 50,00.
          tx(50_00, "Plano antigo", "2026-01-05T00:00:00.000Z"),
          tx(50_00, "Plano antigo", "2026-02-05T00:00:00.000Z"),
          tx(50_00, "Plano antigo", "2026-03-05T00:00:00.000Z"),
          // Conserto pontual: só 1 mês → não recorrente, fica de fora.
          tx(300_00, "Equipamento", "2026-05-20T00:00:00.000Z"),
        ],
        { now: NOW },
      ),
    ).split("\r\n");
    // cabeçalho + 2 categorias recorrentes + Total.
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Sala de ensaio;80,00;3;3;2026-06;240,00;Ativa");
    expect(lines[2]).toBe("Plano antigo;50,00;3;3;2026-03;150,00;Encerrada");
    // Total: conta típica = custo fixo estimado (só ativas = 80,00, não 130,00);
    // total = histórico somado (390,00); situação = 1/2 ativas.
    expect(lines[3]).toBe("Total;80,00;;;;390,00;1/2 ativas");
  });
});

describe("cashFlowToCsv", () => {
  // `now` fixo: a janela são os meses COMPLETOS antes do mês corrente (exclui o
  // mês em curso). Com NOW em julho e janela 3, a janela é abr/mai/jun de 2026.
  const NOW = "2026-07-15T00:00:00.000Z";
  const tx = (
    type: TxLike["type"],
    amount: number,
    date: string,
    received = true,
  ): TxLike => ({
    type,
    amount,
    category: "",
    date,
    received,
    showId: null,
  });

  it("só cabeçalho + todos os meses da janela zerados + Total zerado sem movimento", () => {
    const csv = cashFlowToCsv(cashFlowByMonth([], { now: NOW, months: 3 }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CASH_FLOW_CSV_HEADERS.join(";"));
    // cabeçalho + 3 meses da janela (abr, mai, jun) + Total — janela cheia mesmo vazia.
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("2026-04;0,00;0,00;0,00");
    expect(lines[2]).toBe("2026-05;0,00;0,00;0,00");
    expect(lines[3]).toBe("2026-06;0,00;0,00;0,00");
    expect(lines[4]).toBe("Total;0,00;0,00;0,00");
  });

  it("uma linha por mês da janela (recebido/pago/líquido) em ordem cronológica + Total", () => {
    const months = cashFlowByMonth(
      [
        tx("INCOME", 300000, "2026-04-10T00:00:00.000Z"),
        tx("EXPENSE", 100000, "2026-04-20T00:00:00.000Z"),
        // maio sem movimento → linha zerada (preserva a textura da janela)
        tx("EXPENSE", 50000, "2026-06-05T00:00:00.000Z"),
      ],
      { now: NOW, months: 3 },
    );
    const lines = cashFlowToCsv(months).split("\r\n");
    expect(lines).toHaveLength(5);
    // abr: recebeu 3000, pagou 1000, líquido +2000.
    expect(lines[1]).toBe("2026-04;3000,00;1000,00;2000,00");
    // mai: parado, mas a linha aparece zerada.
    expect(lines[2]).toBe("2026-05;0,00;0,00;0,00");
    // jun: só pagou 500, líquido negativo.
    expect(lines[3]).toBe("2026-06;0,00;500,00;-500,00");
    // Total: recebido 3000, pago 1500, líquido +1500.
    expect(lines[4]).toBe("Total;3000,00;1500,00;1500,00");
  });

  it("ignora não-recebidos e movimento fora da janela (mês corrente e anterior à janela)", () => {
    const months = cashFlowByMonth(
      [
        tx("INCOME", 200000, "2026-05-10T00:00:00.000Z"),
        // pendente (received=false) não entra no caixa
        tx("INCOME", 999900, "2026-05-12T00:00:00.000Z", false),
        // mês corrente (julho) está fora da janela
        tx("INCOME", 500000, "2026-07-02T00:00:00.000Z"),
        // anterior à janela (março) está fora
        tx("EXPENSE", 700000, "2026-03-20T00:00:00.000Z"),
      ],
      { now: NOW, months: 3 },
    );
    const lines = cashFlowToCsv(months).split("\r\n");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("2026-04;0,00;0,00;0,00");
    expect(lines[2]).toBe("2026-05;2000,00;0,00;2000,00");
    expect(lines[3]).toBe("2026-06;0,00;0,00;0,00");
    expect(lines[4]).toBe("Total;2000,00;0,00;2000,00");
  });
});

describe("cashflowProjectionToCsv", () => {
  // mês atual = 2026-03; horizonte sempre do mês corrente em diante.
  const now = "2026-03-15T12:00:00.000Z";
  const tx = (
    type: TxLike["type"],
    amount: number,
    received: boolean,
    date = now,
  ): TxLike => ({
    type,
    amount,
    category: "",
    date,
    received,
    showId: null,
  });

  it("sem movimento: uma linha por mês do horizonte (saldo constante) + Total", () => {
    const csv = cashflowProjectionToCsv(projectCashflow([], { now, months: 3 }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(CASHFLOW_PROJECTION_CSV_HEADERS.join(";"));
    // cabeçalho + 3 meses + Total
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("2026-03;0,00;0,00;0,00;0,00");
    expect(lines[2]).toBe("2026-04;0,00;0,00;0,00;0,00");
    expect(lines[3]).toBe("2026-05;0,00;0,00;0,00;0,00");
    expect(lines[4]).toBe("Total;0,00;0,00;0,00;0,00");
  });

  it("acumula o saldo projetado a partir do caixa atual; Total soma fluxos e traz o saldo final", () => {
    const txs = [
      tx("INCOME", 100_00, true), // caixa atual = 100
      tx("INCOME", 50_00, false, "2026-04-10T00:00:00.000Z"),
      tx("EXPENSE", 20_00, false, "2026-04-20T00:00:00.000Z"),
      tx("EXPENSE", 70_00, false, "2026-05-05T00:00:00.000Z"),
    ];
    const lines = cashflowProjectionToCsv(projectCashflow(txs, { now, months: 3 })).split("\r\n");
    expect(lines).toHaveLength(5);
    // mar: sem pendência, saldo = caixa atual 100.
    expect(lines[1]).toBe("2026-03;0,00;0,00;0,00;100,00");
    // abr: +50 a receber, −20 a pagar, variação +30, saldo 130.
    expect(lines[2]).toBe("2026-04;50,00;20,00;30,00;130,00");
    // mai: −70, saldo 60.
    expect(lines[3]).toBe("2026-05;0,00;70,00;-70,00;60,00");
    // Total: a receber 50, a pagar 90, variação −40, saldo final 60 (= 100 − 40).
    expect(lines[4]).toBe("Total;50,00;90,00;-40,00;60,00");
  });

  it("emite o saldo final negativo (furo de caixa projetado)", () => {
    const txs = [
      tx("INCOME", 50_00, true), // caixa atual = 50
      tx("EXPENSE", 120_00, false, "2026-04-10T00:00:00.000Z"),
    ];
    const lines = cashflowProjectionToCsv(projectCashflow(txs, { now, months: 2 })).split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("2026-03;0,00;0,00;0,00;50,00");
    expect(lines[2]).toBe("2026-04;0,00;120,00;-120,00;-70,00");
    expect(lines[3]).toBe("Total;0,00;120,00;-120,00;-70,00");
  });
});

describe("bookedRevenueToCsv", () => {
  // `now` fixo: "futuro" = dia do show >= hoje (UTC). Shows antes de hoje e
  // cancelados não entram.
  const NOW = "2026-06-29T00:00:00.000Z";
  const show = (
    fee: number,
    date: string,
    status = "CONFIRMED",
  ): BookedRevenueShowLike => ({ fee, date, status });

  it("só cabeçalho + Total zerado sem shows agendados", () => {
    const csv = bookedRevenueToCsv(forecastBookedRevenue([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(BOOKED_REVENUE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0;0,00;0,00;0,00");
  });

  it("uma linha por mês com shows (confirmado/a confirmar/total) em ordem crescente + Total", () => {
    const forecast = forecastBookedRevenue(
      [
        // julho: 1 confirmado (2000) + 1 proposto (500) → total 2500
        show(200000, "2026-07-05T00:00:00.000Z", "CONFIRMED"),
        show(50000, "2026-07-20T00:00:00.000Z", "PROPOSED"),
        // agosto: 1 realizado (conta como confirmado) 1000
        show(100000, "2026-08-10T00:00:00.000Z", "PLAYED"),
      ],
      { now: new Date(NOW) },
    );
    const lines = bookedRevenueToCsv(forecast).split("\r\n");
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("2026-07;2;2000,00;500,00;2500,00");
    expect(lines[2]).toBe("2026-08;1;1000,00;0,00;1000,00");
    expect(lines[3]).toBe("Total;3;3000,00;500,00;3500,00");
  });

  it("ignora cancelados e shows passados; status ausente conta como a confirmar", () => {
    const forecast = forecastBookedRevenue(
      [
        // cancelado: fora
        show(900000, "2026-07-05T00:00:00.000Z", "CANCELLED"),
        // passado (antes de hoje): fora
        show(800000, "2026-06-01T00:00:00.000Z", "CONFIRMED"),
        // sem status → tentativo (a confirmar)
        { fee: 70000, date: "2026-07-15T00:00:00.000Z" },
      ],
      { now: new Date(NOW) },
    );
    const lines = bookedRevenueToCsv(forecast).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("2026-07;1;0,00;700,00;700,00");
    expect(lines[2]).toBe("Total;1;0,00;700,00;700,00");
  });
});

describe("pipelineToCsv", () => {
  const show = (fee: number, status?: string, id = "s"): ShowLike => ({ id, fee, status });

  it("sem shows: cabeçalho + as quatro etapas zeradas + Total zerado", () => {
    const lines = pipelineToCsv(showPipeline([])).split("\r\n");
    expect(lines[0]).toBe(PIPELINE_CSV_HEADERS.join(";"));
    // O funil sempre lista as quatro etapas (é um retrato do estado), mesmo vazias.
    expect(lines).toHaveLength(6);
    expect(lines[1]).toBe("Proposto;0;0%;0,00");
    expect(lines[5]).toBe("Total;0;;0,00");
  });

  it("uma linha por etapa com contagem/participação/cachê + Total", () => {
    const pipeline = showPipeline([
      show(100000, "PROPOSED"),
      show(50000, "PROPOSED"),
      show(200000, "CONFIRMED"),
      show(300000, "PLAYED"),
    ]);
    const lines = pipelineToCsv(pipeline).split("\r\n");
    expect(lines).toHaveLength(6);
    expect(lines[1]).toBe("Proposto;2;50%;1500,00");
    expect(lines[2]).toBe("Confirmado;1;25%;2000,00");
    expect(lines[3]).toBe("Realizado;1;25%;3000,00");
    expect(lines[4]).toBe("Cancelado;0;0%;0,00");
    // Total soma TODAS as etapas (inclusive realizadas/canceladas); participação em branco.
    expect(lines[5]).toBe("Total;4;;6500,00");
  });

  it("cancelados viram linha; shows sem status ficam de fora do funil", () => {
    const pipeline = showPipeline([
      show(100000, "PROPOSED"),
      show(80000, "CANCELLED"),
      show(999999), // sem status → ignorado por showPipeline
    ]);
    const lines = pipelineToCsv(pipeline).split("\r\n");
    expect(lines).toHaveLength(6);
    expect(lines[1]).toBe("Proposto;1;50%;1000,00");
    expect(lines[4]).toBe("Cancelado;1;50%;800,00");
    expect(lines[5]).toBe("Total;2;;1800,00");
    // Sem coluna de taxa de concretização (escalar de destaque, não tabular).
    expect(lines[0].split(";")).toHaveLength(4);
  });
});

describe("stageDurationsToCsv", () => {
  const ev = (fromStatus: string | null, toStatus: string, createdAt: string) => ({
    fromStatus,
    toStatus,
    createdAt,
  });

  it("sem amostra: só cabeçalho + Total zerado", () => {
    const lines = stageDurationsToCsv(funnelStageDurations([])).split("\r\n");
    expect(lines[0]).toBe(STAGE_DURATIONS_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    // Total: 0 transições; colunas de dias + % do percurso em branco (sem agregado honesto).
    expect(lines[1]).toBe("Total;0;;;;;");
  });

  it("uma linha por etapa (ordem canônica do funil) com dias crus + % do percurso + Total", () => {
    const durations = funnelStageDurations([
      {
        statusEvents: [
          ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
          ev("PROPOSED", "CONFIRMED", "2026-01-05T00:00:00.000Z"), // 4 dias em Proposto
          ev("CONFIRMED", "PLAYED", "2026-01-11T00:00:00.000Z"), // 6 dias em Confirmado
        ],
      },
    ]);
    const lines = stageDurationsToCsv(durations).split("\r\n");
    // cabeçalho + 2 etapas com amostra + Total
    expect(lines).toHaveLength(4);
    // % do percurso: mediana da etapa ÷ soma (4+6=10) → 40% / 60%.
    expect(lines[1]).toBe("Proposto;1;4;4;4;4;40%");
    expect(lines[2]).toBe("Confirmado;1;6;6;6;6;60%");
    // Total soma as transições cronometradas; dias + % em branco.
    expect(lines[3]).toBe("Total;2;;;;;");
    // Emite o inteiro de dias cru (legível por máquina), não "N dias" da UI; 7 colunas.
    expect(lines[0].split(";")).toHaveLength(7);
  });

  it("% do percurso em branco por linha quando não há mediana positiva (o \"—\" da tela)", () => {
    // Todas as transições no mesmo dia → medianas 0 → soma 0 (sem naco honesto).
    const sameDay = {
      statusEvents: [
        ev(null, "PROPOSED", "2026-03-01T09:00:00.000Z"),
        ev("PROPOSED", "CONFIRMED", "2026-03-01T15:00:00.000Z"),
      ],
    };
    const lines = stageDurationsToCsv(funnelStageDurations([sameDay])).split("\r\n");
    // Proposto: 0 dias, % em branco (não "0%").
    expect(lines[1]).toBe("Proposto;1;0;0;0;0;");
    expect(lines[2]).toBe("Total;1;;;;;");
  });

  it("agrega a mesma etapa entre shows (mediana/média/mín/máx)", () => {
    const mkProposed = (days: number, id: string) => ({
      statusEvents: [
        ev(null, "PROPOSED", `2026-02-0${id}T00:00:00.000Z`),
        ev(
          "PROPOSED",
          "CONFIRMED",
          new Date(
            Date.parse(`2026-02-0${id}T00:00:00.000Z`) + days * 86400000,
          ).toISOString(),
        ),
      ],
    });
    const durations = funnelStageDurations([
      mkProposed(2, "1"),
      mkProposed(4, "2"),
      mkProposed(9, "3"),
    ]);
    const lines = stageDurationsToCsv(durations).split("\r\n");
    // mediana [2,4,9]=4, média 5, mín 2, máx 9; etapa única → 100% do percurso.
    expect(lines[1]).toBe("Proposto;3;4;5;2;9;100%");
    expect(lines[2]).toBe("Total;3;;;;;");
  });

  it("com previousYear anexa a coluna vs. {ano-1} (dias) com variação assinada, novo e Total em branco", () => {
    const start = (year: number) => Date.parse(`${year}-06-01T00:00:00.000Z`);
    const inYear = (year: number, proposed: number, confirmed?: number) => {
      const events = [
        ev(null, "PROPOSED", new Date(start(year)).toISOString()),
        ev("PROPOSED", "CONFIRMED", new Date(start(year) + proposed * 86400000).toISOString()),
      ];
      if (confirmed !== undefined) {
        events.push(
          ev("CONFIRMED", "PLAYED", new Date(start(year) + (proposed + confirmed) * 86400000).toISOString()),
        );
      }
      return { statusEvents: events };
    };
    // PROPOSED acelerou (20 → 4 = −16); CONFIRMED só existe em 2026 → "novo".
    const shows = [inYear(2025, 20), inYear(2026, 4, 10)];
    const current = funnelStageDurations(shows, { year: 2026 });
    const previous = funnelStageDurations(shows, { year: 2025 });
    const comparison = compareFunnelStageDurations(current, previous);
    const rowStatus = indexStageDurationChanges(comparison);
    const lines = stageDurationsToCsv(current, undefined, 2025, rowStatus).split("\r\n");
    // Cabeçalho: 7 colunas fixas (incl. % do percurso) + a coluna de tendência anexa.
    expect(lines[0]).toBe(STAGE_DURATIONS_CSV_HEADERS.join(";") + ";vs. 2025 (dias)");
    // % do percurso: Proposto 4 / (4+10=14) → 29%; Confirmado 10/14 → 71%.
    // Proposto: variação -16 dias (sinal ASCII cru, legível por máquina).
    expect(lines[1]).toBe("Proposto;1;4;4;4;4;29%;-16");
    // Confirmado: só em 2026 → "novo".
    expect(lines[2]).toBe("Confirmado;1;10;10;10;10;71%;novo");
    // Total: % do percurso e tendência em branco.
    expect(lines[3]).toBe("Total;2;;;;;;");
  });
});

describe("proposalDeliberationByContactToCsv", () => {
  const ev = (fromStatus: string | null, toStatus: string, createdAt: string) => ({
    fromStatus,
    toStatus,
    createdAt,
  });
  const decided = (days: number) => ({
    statusEvents: [
      ev(null, "PROPOSED", "2026-01-01T00:00:00.000Z"),
      ev(
        "PROPOSED",
        "CONFIRMED",
        new Date(Date.parse("2026-01-01T00:00:00.000Z") + days * 86400000).toISOString(),
      ),
    ],
  });
  const c = (id: string, name: string) => ({ id, name, role: "CONTRACTOR" });

  it("sem contratantes: só cabeçalho + Total zerado", () => {
    const report = proposalDeliberationByContact([]);
    const lines = proposalDeliberationByContactToCsv(report.rows, report.totalSamples).split(
      "\r\n",
    );
    expect(lines[0]).toBe(PROPOSAL_DELIBERATION_BY_CONTACT_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0;;;;;");
  });

  it("uma linha por contratante (menor mediana primeiro) + Total; dias crus", () => {
    const report = proposalDeliberationByContact([
      { contact: c("slow", "Lento"), shows: [decided(10), decided(20), decided(30)] },
      { contact: c("fast", "Rápido"), shows: [decided(1), decided(3), decided(5)] },
    ]);
    const lines = proposalDeliberationByContactToCsv(report.rows, report.totalSamples).split(
      "\r\n",
    );
    expect(lines).toHaveLength(4); // cabeçalho + 2 contratantes + Total
    // Rápido primeiro: mediana [1,3,5]=3, média 3, mín 1, máx 5, 3/6 = 50%
    expect(lines[1]).toBe("Rápido;3;3;3;1;5;50%");
    // Lento: mediana [10,20,30]=20, média 20, mín 10, máx 30, 50%
    expect(lines[2]).toBe("Lento;3;20;20;10;30;50%");
    expect(lines[3]).toBe("Total;6;;;;;");
  });

  it("suprime a mediana de amostra fina (não-confiável), mantendo as demais colunas", () => {
    const report = proposalDeliberationByContact([
      { contact: c("1", "Ana"), shows: [decided(5), decided(9)] }, // 2 decisões < MIN
    ]);
    const lines = proposalDeliberationByContactToCsv(report.rows, report.totalSamples).split(
      "\r\n",
    );
    // Mediana em branco; média [5,9]=7, mín 5, máx 9, 2/2 = 100%
    expect(lines[1]).toBe("Ana;2;;7;5;9;100%");
  });

  it("com previousYear ganha a coluna vs. {ano-1}: variação assinada, novo e Total em branco", () => {
    const report = proposalDeliberationByContact([
      { contact: c("ana", "Ana"), shows: [decided(4), decided(6), decided(8)] }, // mediana 6
      { contact: c("beto", "Beto"), shows: [decided(1), decided(3), decided(5)] }, // mediana 3
    ]);
    const rows = [
      // Ana passou a decidir mais rápido: −4 dias.
      { ...report.rows.find((r) => r.contact.name === "Beto")!, medianDaysDelta: -4 },
      // Beto é novo no ano.
      { ...report.rows.find((r) => r.contact.name === "Ana")!, isNew: true },
    ];
    const lines = proposalDeliberationByContactToCsv(
      rows,
      report.totalSamples,
      ";",
      2025,
    ).split("\r\n");
    expect(lines[0]).toBe(
      PROPOSAL_DELIBERATION_BY_CONTACT_CSV_HEADERS.join(";") + ";vs. 2025 (dias)",
    );
    // Beto (mediana 3): variação −4 dias.
    expect(lines[1]).toBe("Beto;3;3;3;1;5;50%;-4");
    // Ana: novo.
    expect(lines[2]).toBe("Ana;3;6;6;4;8;50%;novo");
    // Total ganha a célula vazia extra.
    expect(lines[3]).toBe("Total;6;;;;;;");
  });
});

describe("proposalConversionToCsv", () => {
  const ev = (toStatus: string, createdAt: string) => ({
    fromStatus: null,
    toStatus,
    createdAt,
  });

  it("sem coorte: só cabeçalho + desfechos zerados + Total zerado", () => {
    const lines = proposalConversionToCsv(proposalOutcomes([])).split("\r\n");
    expect(lines[0]).toBe(PROPOSAL_CONVERSION_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("Realizadas;0;0%");
    expect(lines[2]).toBe("Perdidas;0;0%");
    expect(lines[3]).toBe("Em aberto;0;0%");
    // Participação do Total em branco (é 100% por construção).
    expect(lines[4]).toBe("Total;0;");
  });

  it("uma linha por desfecho com a participação na coorte + Total", () => {
    const conv = proposalOutcomes([
      {
        statusEvents: [
          ev("PROPOSED", "2026-01-01T00:00:00.000Z"),
          ev("PLAYED", "2026-01-20T00:00:00.000Z"),
        ],
      },
      {
        statusEvents: [
          ev("PROPOSED", "2026-02-01T00:00:00.000Z"),
          ev("CANCELLED", "2026-02-10T00:00:00.000Z"),
        ],
      },
      { statusEvents: [ev("PROPOSED", "2026-03-01T00:00:00.000Z")] },
      { statusEvents: [ev("PROPOSED", "2026-04-01T00:00:00.000Z")] },
    ]);
    const lines = proposalConversionToCsv(conv).split("\r\n");
    // coorte de 4: 1 ganha (25%), 1 perdida (25%), 2 em aberto (50%)
    expect(lines[1]).toBe("Realizadas;1;25%");
    expect(lines[2]).toBe("Perdidas;1;25%");
    expect(lines[3]).toBe("Em aberto;2;50%");
    expect(lines[4]).toBe("Total;4;");
  });

  it("respeita o recorte por ano da proposta (mesma coorte da página)", () => {
    const shows = [
      {
        statusEvents: [
          ev("PROPOSED", "2025-12-01T00:00:00.000Z"),
          ev("PLAYED", "2026-01-10T00:00:00.000Z"),
        ],
      },
      {
        statusEvents: [
          ev("PROPOSED", "2026-02-01T00:00:00.000Z"),
          ev("CANCELLED", "2026-02-05T00:00:00.000Z"),
        ],
      },
    ];
    const lines = proposalConversionToCsv(
      proposalOutcomes(shows, { year: 2026 }),
    ).split("\r\n");
    // só a proposta de 2026 (perdida) entra
    expect(lines[1]).toBe("Realizadas;0;0%");
    expect(lines[2]).toBe("Perdidas;1;100%");
    expect(lines[3]).toBe("Em aberto;0;0%");
    expect(lines[4]).toBe("Total;1;");
  });
});

describe("proposalConversionComparisonToCsv", () => {
  const ev = (toStatus: string, createdAt: string) => ({
    fromStatus: null,
    toStatus,
    createdAt,
  });
  const won = (createdAt: string) => ({
    statusEvents: [ev("PROPOSED", createdAt), ev("PLAYED", createdAt)],
  });
  const lost = (createdAt: string) => ({
    statusEvents: [ev("PROPOSED", createdAt), ev("CANCELLED", createdAt)],
  });
  const open = (createdAt: string) => ({
    statusEvents: [ev("PROPOSED", createdAt)],
  });

  // Acervo: 2025 fecha 1 de 2 decididas (50%); 2026 fecha 3 de 4 decididas (75%),
  // com 1 em aberto (coorte de 5). A conversão real sobe +25 p.p. → "improved".
  const shows = [
    won("2025-01-01T00:00:00.000Z"),
    lost("2025-02-01T00:00:00.000Z"),
    won("2026-01-01T00:00:00.000Z"),
    won("2026-02-01T00:00:00.000Z"),
    won("2026-03-01T00:00:00.000Z"),
    lost("2026-04-01T00:00:00.000Z"),
    open("2026-05-01T00:00:00.000Z"),
  ];
  const comparison = compareProposalOutcomes(
    proposalOutcomes(shows, { year: 2026 }),
    proposalOutcomes(shows, { year: 2025 }),
  );

  it("uma linha por métrica com os dois anos e a variação + linha Tendência", () => {
    const lines = proposalConversionComparisonToCsv(comparison).split("\r\n");
    expect(lines[0]).toBe(PROPOSAL_CONVERSION_COMPARISON_CSV_HEADERS.join(";"));
    // Taxa de conversão real: 50% (2025) → 75% (2026), +25 p.p.
    expect(lines[1]).toBe("Taxa de conversão real (%);50%;75%;+25");
    // Vazão da coorte (winRate = ganhas / coorte): 2025 1/2=50%, 2026 3/5=60%, +10 p.p.
    expect(lines[2]).toBe("Vazão da coorte (%);50%;60%;+10");
    // Realizadas: 1 → 3 (+2)
    expect(lines[3]).toBe("Propostas realizadas;1;3;+2");
    // Decididas: 2 → 4 (+2)
    expect(lines[4]).toBe("Propostas decididas;2;4;+2");
    // Propostas na coorte: 2 → 5 (+3)
    expect(lines[5]).toBe("Propostas na coorte;2;5;+3");
    // Tendência editorial na coluna de variação.
    expect(lines[6]).toBe("Tendência;;;Convertendo mais");
    expect(lines).toHaveLength(7);
  });

  it("veredito 'Convertendo menos' quando a conversão real cai além do limiar", () => {
    // Inverte os anos: agora 2025 é o corrente (75%) e 2026 o anterior (50%)?
    // Mais simples: monta uma queda direta — 2026 fecha 1 de 4 (25%), 2025 fecha 2 de 2 (100%).
    const falling = [
      won("2025-01-01T00:00:00.000Z"),
      won("2025-02-01T00:00:00.000Z"),
      won("2026-01-01T00:00:00.000Z"),
      lost("2026-02-01T00:00:00.000Z"),
      lost("2026-03-01T00:00:00.000Z"),
      lost("2026-04-01T00:00:00.000Z"),
    ];
    const comp = compareProposalOutcomes(
      proposalOutcomes(falling, { year: 2026 }),
      proposalOutcomes(falling, { year: 2025 }),
    );
    const lines = proposalConversionComparisonToCsv(comp).split("\r\n");
    // 100% → 25%, −75 p.p.
    expect(lines[1]).toBe("Taxa de conversão real (%);100%;25%;-75");
    expect(lines[6]).toBe("Tendência;;;Convertendo menos");
  });

  it("taxa indefinida em algum ano: célula e variação da taxa em branco, sem base", () => {
    // 2025 só com proposta em aberto (nenhuma decidida → conversionRate null),
    // 2026 fecha 1 de 1. Sem base para a variação da taxa de conversão real.
    const partial = [
      open("2025-01-01T00:00:00.000Z"),
      won("2026-01-01T00:00:00.000Z"),
    ];
    const comp = compareProposalOutcomes(
      proposalOutcomes(partial, { year: 2026 }),
      proposalOutcomes(partial, { year: 2025 }),
    );
    const lines = proposalConversionComparisonToCsv(comp).split("\r\n");
    // 2025 sem decididas → taxa em branco; 2026 100%; variação sem base → em branco.
    expect(lines[1]).toBe("Taxa de conversão real (%);;100%;");
    // winRate 2025 = 0/1 = 0% (tem coorte), 2026 = 1/1 = 100% → +100 p.p.
    expect(lines[2]).toBe("Vazão da coorte (%);0%;100%;+100");
    // Sem variação de taxa → tendência estável.
    expect(lines[6]).toBe("Tendência;;;Estável");
  });

  it("aceita delimitador alternativo", () => {
    const csv = proposalConversionComparisonToCsv(comparison, ",");
    expect(csv.split("\r\n")[0]).toBe(
      PROPOSAL_CONVERSION_COMPARISON_CSV_HEADERS.join(","),
    );
  });
});

describe("proposalConversionByContactToCsv", () => {
  const ev = (toStatus: string, createdAt: string) => ({
    fromStatus: null,
    toStatus,
    createdAt,
  });
  const won = (createdAt: string) => ({
    statusEvents: [ev("PROPOSED", createdAt), ev("PLAYED", createdAt)],
  });
  const lost = (createdAt: string) => ({
    statusEvents: [ev("PROPOSED", createdAt), ev("CANCELLED", createdAt)],
  });
  const open = (createdAt: string) => ({
    statusEvents: [ev("PROPOSED", createdAt)],
  });

  it("sem contratantes na coorte: só cabeçalho + Total zerado", () => {
    const lines = proposalConversionByContactToCsv(
      proposalOutcomesByContact<{ id: string; name: string; role: string }>([]),
    ).split("\r\n");
    expect(lines[0]).toBe(PROPOSAL_CONVERSION_BY_CONTACT_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    // conversão indefinida (sem decididas) fica em branco
    expect(lines[1]).toBe("Total;;;0;0;0;0;0");
  });

  it("uma linha por contratante na ordem do relatório + Total da carteira", () => {
    const report = proposalOutcomesByContact([
      {
        contact: { id: "a", name: "Alfa", role: "VENUE" },
        shows: [
          won("2026-01-01T00:00:00.000Z"),
          won("2026-01-02T00:00:00.000Z"),
          lost("2026-01-03T00:00:00.000Z"),
        ],
      },
      {
        contact: { id: "b", name: "Beta", role: "PRODUCER" },
        shows: [won("2026-01-01T00:00:00.000Z"), open("2026-01-02T00:00:00.000Z")],
      },
    ]);
    const lines = proposalConversionByContactToCsv(report).split("\r\n");
    // Beta 100% (1/1) vem antes de Alfa 67% (2/3)
    // Contratante;Papel;Conversão(%);Propostas;Realizadas;Perdidas;Em aberto;Decididas
    expect(lines[1]).toBe("Beta;Produtor musical;100%;2;1;0;1;1");
    expect(lines[2]).toBe("Alfa;Casa de show;67%;3;2;1;0;3");
    // Total por relação: 5 propostas, 3 realizadas, 1 perdida, 1 aberta, 4 decididas → 75%
    expect(lines[3]).toBe("Total;;75%;5;3;1;1;4");
  });

  it("conversão em branco para contratante ainda sem proposta decidida", () => {
    const report = proposalOutcomesByContact([
      {
        contact: { id: "a", name: "Alfa", role: "VENUE" },
        shows: [open("2026-01-01T00:00:00.000Z")],
      },
    ]);
    const lines = proposalConversionByContactToCsv(report).split("\r\n");
    expect(lines[1]).toBe("Alfa;Casa de show;;1;0;0;1;0");
  });

  it("sem previous/previousYear: 8 colunas idênticas ao histórico", () => {
    const report = proposalOutcomesByContact([
      {
        contact: { id: "a", name: "Alfa", role: "VENUE" },
        shows: [won("2026-01-01T00:00:00.000Z")],
      },
    ]);
    const lines = proposalConversionByContactToCsv(report).split("\r\n");
    expect(lines[0]).toBe(PROPOSAL_CONVERSION_BY_CONTACT_CSV_HEADERS.join(";"));
    // sem coluna de tendência
    expect(lines[0].split(";")).toHaveLength(8);
  });

  it("com previous/previousYear: coluna 'vs. {ano}' com pontos assinados, 'novo' e Total em branco", () => {
    // Alfa: 2026 fecha 2/2 (100%); 2025 fechou 1/2 (50%) → +50 p.p.
    // Beta: só coorte em 2026 → "novo"
    const items = [
      {
        contact: { id: "a", name: "Alfa", role: "VENUE" },
        shows: [
          won("2026-01-01T00:00:00.000Z"),
          won("2026-01-02T00:00:00.000Z"),
          won("2025-01-01T00:00:00.000Z"),
          lost("2025-01-02T00:00:00.000Z"),
        ],
      },
      {
        contact: { id: "b", name: "Beta", role: "PRODUCER" },
        shows: [won("2026-01-03T00:00:00.000Z")],
      },
    ];
    const current = proposalOutcomesByContact(items, { year: 2026 });
    const previous = proposalOutcomesByContact(items, { year: 2025 });
    const lines = proposalConversionByContactToCsv(
      current,
      undefined,
      previous,
      2025,
    ).split("\r\n");
    // cabeçalho ganha a 9ª coluna
    expect(lines[0]).toBe(
      PROPOSAL_CONVERSION_BY_CONTACT_CSV_HEADERS.join(";") + ";vs. 2025 (p.p.)",
    );
    // Alfa 100% em 2026, era 50% em 2025 → +50
    expect(lines[1]).toBe("Alfa;Casa de show;100%;2;2;0;0;2;+50");
    // Beta só existe em 2026 → "novo"
    expect(lines[2]).toBe("Beta;Produtor musical;100%;1;1;0;0;1;novo");
    // Total sempre em branco na coluna de tendência
    expect(lines[3]).toBe("Total;;100%;3;3;0;0;3;");
  });

  it("com previous mas taxa indefinida em algum ano: célula em branco (sem base)", () => {
    // Alfa: 2026 fecha 1/1 (100%); 2025 só teve proposta em aberto (taxa indefinida)
    // → conversionRateDelta null → célula em branco
    const items = [
      {
        contact: { id: "a", name: "Alfa", role: "VENUE" },
        shows: [won("2026-01-01T00:00:00.000Z"), open("2025-01-01T00:00:00.000Z")],
      },
    ];
    const current = proposalOutcomesByContact(items, { year: 2026 });
    const previous = proposalOutcomesByContact(items, { year: 2025 });
    const lines = proposalConversionByContactToCsv(
      current,
      undefined,
      previous,
      2025,
    ).split("\r\n");
    expect(lines[1]).toBe("Alfa;Casa de show;100%;1;1;0;0;1;");
  });
});

describe("staleProposalsToCsv", () => {
  const NOW = new Date("2026-06-01T00:00:00.000Z");
  const daysBefore = (n: number) => new Date(NOW.getTime() - n * 86400000).toISOString();
  const daysAfter = (n: number) => new Date(NOW.getTime() + n * 86400000).toISOString();
  const prop = (partial: Partial<StaleProposalShowLike>): StaleProposalShowLike => ({
    id: "s1",
    title: "Show",
    date: daysAfter(60),
    venue: null,
    city: null,
    fee: 100_00,
    status: "PROPOSED",
    createdAt: daysBefore(30),
    ...partial,
  });

  it("sem propostas paradas: só o cabeçalho", () => {
    const lines = staleProposalsToCsv(findStaleProposals([], { now: NOW })).split("\r\n");
    expect(lines[0]).toBe(STALE_PROPOSALS_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(1);
  });

  it("uma linha por proposta na ordem da fila + Total com cachê em risco", () => {
    const report = findStaleProposals(
      [
        prop({ id: "cold", title: "Bar Cold", createdAt: daysBefore(40), date: daysAfter(80), fee: 200_00, city: "SP" }),
        prop({ id: "overdue", title: "Bar Over", createdAt: daysBefore(40), date: daysBefore(3), fee: 150_00, venue: "Casa X" }),
      ],
      { now: NOW },
    );
    const lines = staleProposalsToCsv(report).split("\r\n");
    // cabeçalho + 2 propostas + Total
    expect(lines).toHaveLength(4);
    // overdue vem antes de cold
    expect(lines[1].startsWith("Vencida;Bar Over;")).toBe(true);
    expect(lines[2].startsWith("Sem resposta;Bar Cold;")).toBe(true);
    // dias até o show crus (negativo = vencida)
    expect(lines[1]).toContain(";-3;");
    // Total: contagem + cachê somado (350,00), coluna dias-até em branco
    expect(lines[3]).toBe("Total;2 propostas paradas;;;;;;350,00");
  });

  it("rotula a urgência iminente e emite cidade/local", () => {
    const report = findStaleProposals(
      [prop({ id: "imm", title: "Show Imm", createdAt: daysBefore(30), date: daysAfter(5), venue: "Casa Y", city: "RJ" })],
      { now: NOW },
    );
    const lines = staleProposalsToCsv(report).split("\r\n");
    const cols = lines[1].split(";");
    expect(cols[0]).toBe("Iminente");
    expect(cols[3]).toBe("Casa Y");
    expect(cols[4]).toBe("RJ");
  });
});

describe("pipelineByContactToCsv", () => {
  interface C extends ContactRankLike {
    role: string;
  }
  const item = (
    contact: C,
    shows: { status: string; date: string; fee: number }[],
  ) => ({ contact, shows });
  const s = (status: string, fee: number) => ({
    status,
    date: "2026-05-01T20:00:00.000Z",
    fee,
  });

  it("só cabeçalho + Total zerado quando não há pipeline aberto", () => {
    const csv = pipelineByContactToCsv(pipelineByContact<C>([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(PIPELINE_BY_CONTACT_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    // valores zerados; contagens por etapa e concretização em branco no Total.
    expect(lines[1]).toBe("Total;;0,00;0;0,00;;0,00;;;;");
  });

  it("uma linha por contratante (maior cachê aberto primeiro) + Total", () => {
    const report = pipelineByContact<C>([
      // 300 confirmado, nada decidido → concretização em branco
      item({ id: "m", name: "Médio", role: "PROMOTER" }, [
        s("CONFIRMED", 300_00),
      ]),
      // 900 proposto + histórico 1 realizado / 1 cancelado → 50%
      item({ id: "g", name: "Grande", role: "VENUE" }, [
        s("PROPOSED", 900_00),
        s("PLAYED", 100_00),
        s("CANCELLED", 100_00),
      ]),
    ]);
    const lines = pipelineByContactToCsv(report).split("\r\n");
    // cabeçalho + 2 contratantes (Grande antes de Médio por cachê aberto) + Total
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("Grande;Casa de show;900,00;1;900,00;1;0,00;0;50%;1;2");
    expect(lines[2]).toBe("Médio;Produtor/Promoter;300,00;1;0,00;0;300,00;1;;0;0");
    // Total: 1200 aberto em 2 shows; 900 proposto + 300 confirmado; concretização
    // da carteira 50% (1 realizado / 2 decididos); contagens por etapa em branco.
    expect(lines[3]).toBe("Total;;1200,00;2;900,00;;300,00;;50%;;");
  });

  it("contratante só com shows decididos não vira linha, mas conta na concretização do Total", () => {
    const report = pipelineByContact<C>([
      // sem pipeline aberto (só decididos) → some da lista, mas entra no Total
      item({ id: "f", name: "Fechado", role: "VENUE" }, [
        s("PLAYED", 100_00),
        s("CANCELLED", 100_00),
      ]),
      // proposta em aberto, nada decidido ainda → concretização própria em branco
      item({ id: "a", name: "Ativo", role: "BOOKER" }, [s("PROPOSED", 300_00)]),
    ]);
    const lines = pipelineByContactToCsv(report).split("\r\n");
    expect(lines).toHaveLength(3);
    // a linha do "Ativo" traz realizados/decididos 0, concretização em branco…
    expect(lines[1]).toBe("Ativo;Contratante;300,00;1;300,00;1;0,00;0;;0;0");
    // …mas o Total mostra 50% (1 realizado / 2 decididos do "Fechado", sem linha).
    expect(lines[2]).toBe("Total;;300,00;1;300,00;;0,00;;50%;;");
  });

  it("com comparativo: coluna 'vs. {ano-1}' com pontos assinados / novo / em branco", () => {
    // Ano atual: g fecha 3/4 (75%), b fecha 1/2 (50%), n só apareceu agora.
    const current = pipelineByContact<C>([
      item({ id: "g", name: "Grande", role: "VENUE" }, [
        s("PROPOSED", 900_00),
        s("PLAYED", 100_00),
        s("PLAYED", 100_00),
        s("PLAYED", 100_00),
        s("CANCELLED", 100_00),
      ]),
      item({ id: "b", name: "Base", role: "VENUE" }, [
        s("PROPOSED", 300_00),
        s("PLAYED", 100_00),
        s("CANCELLED", 100_00),
      ]),
      item({ id: "n", name: "Novo", role: "VENUE" }, [s("PROPOSED", 200_00)]),
    ]);
    // Ano anterior: g fechava 1/2 (50%); b tinha pipeline aberto mas nada decidido
    // (taxa indefinida → sem base de comparação). n não existia.
    const previous = pipelineByContact<C>([
      item({ id: "g", name: "Grande", role: "VENUE" }, [
        s("PROPOSED", 500_00),
        s("PLAYED", 100_00),
        s("CANCELLED", 100_00),
      ]),
      item({ id: "b", name: "Base", role: "VENUE" }, [s("PROPOSED", 300_00)]),
    ]);

    const lines = pipelineByContactToCsv(current, undefined, previous, 2025).split(
      "\r\n",
    );
    // cabeçalho ganha a última coluna "vs. 2025 (p.p.)"
    expect(lines[0]).toBe(
      [...PIPELINE_BY_CONTACT_CSV_HEADERS, "vs. 2025 (p.p.)"].join(";"),
    );
    // ordem por cachê aberto desc: g (900) → b (300) → n (200) → Total
    expect(lines).toHaveLength(5);
    // g: 50% → 75% = +25 pontos
    expect(lines[1]).toBe(
      "Grande;Casa de show;900,00;1;900,00;1;0,00;0;75%;3;4;+25",
    );
    // b: taxa indefinida no ano anterior → sem base, célula em branco
    expect(lines[2]).toBe("Base;Casa de show;300,00;1;300,00;1;0,00;0;50%;1;2;");
    // n: só teve pipeline neste ano → "novo"
    expect(lines[3]).toBe("Novo;Casa de show;200,00;1;200,00;1;0,00;0;;0;0;novo");
    // Total: concretização da carteira 4/6 = 67%; coluna de tendência em branco
    expect(lines[4]).toBe("Total;;1400,00;3;1400,00;;0,00;;67%;;;");
  });

  it("sem ano anterior informado: saída idêntica à histórica (11 colunas)", () => {
    const report = pipelineByContact<C>([
      item({ id: "g", name: "Grande", role: "VENUE" }, [s("PROPOSED", 900_00)]),
    ]);
    // previous presente mas previousYear nulo → não ativa a coluna (guarda AND).
    const withPrevOnly = pipelineByContactToCsv(report, undefined, report, null);
    const plain = pipelineByContactToCsv(report);
    expect(withPrevOnly).toBe(plain);
    expect(withPrevOnly.split("\r\n")[0]).toBe(
      PIPELINE_BY_CONTACT_CSV_HEADERS.join(";"),
    );
  });
});

describe("dueAgendaToCsv", () => {
  // `now` fixo: as janelas e o `daysUntil` são relativos a este dia (UTC).
  const NOW = "2026-06-29T00:00:00.000Z";
  const tx = (
    over: Partial<DueAgendaCsvTx> & { type: DueAgendaCsvTx["type"]; date: string },
  ): DueAgendaCsvTx => ({
    amount: 0,
    category: "Geral",
    received: false,
    ...over,
  });

  it("só cabeçalho + Total zerado sem pendências", () => {
    const csv = dueAgendaToCsv(buildDueAgenda([], { now: new Date(NOW) }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(DUE_AGENDA_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;;;;;;;0,00;0,00");
  });

  it("uma linha por pendência nas quatro janelas (ordem canônica) + Total", () => {
    const agenda = buildDueAgenda(
      [
        tx({ type: "INCOME", date: "2026-07-02T00:00:00.000Z", amount: 20000, category: "Cachê", description: "Casamento" }),
        tx({ type: "EXPENSE", date: "2026-07-20T00:00:00.000Z", amount: 10000, category: "Equipamento", description: "Cabo" }),
        tx({ type: "EXPENSE", date: "2026-06-20T00:00:00.000Z", amount: 30000, category: "Aluguel", description: "Sala de ensaio" }),
        tx({ type: "INCOME", date: "2026-06-29T00:00:00.000Z", amount: 50000, category: "Cachê", description: "Show X", show: { title: "Bar do Zé" } }),
      ],
      { now: new Date(NOW) },
    );
    const lines = dueAgendaToCsv(agenda).split("\r\n");
    expect(lines).toHaveLength(6);
    // overdue → today → week → later
    expect(lines[1]).toBe("20/06/2026;Sala de ensaio;Aluguel;Vencidas;A pagar;-9;;0,00;300,00");
    expect(lines[2]).toBe("29/06/2026;Show X;Cachê;Hoje;A receber;0;Bar do Zé;500,00;0,00");
    expect(lines[3]).toBe("02/07/2026;Casamento;Cachê;Próximos 7 dias;A receber;3;;200,00;0,00");
    expect(lines[4]).toBe("20/07/2026;Cabo;Equipamento;Mais tarde;A pagar;21;;0,00;100,00");
    expect(lines[5]).toBe("Total;;;;;;;700,00;400,00");
  });

  it("ignora pendências já realizadas, ordena por vencimento na janela e trata descrição ausente", () => {
    const agenda = buildDueAgenda(
      [
        // já realizada (received): fora da agenda
        tx({ type: "INCOME", date: "2026-06-15T00:00:00.000Z", amount: 99999, received: true, category: "Cachê" }),
        // vencida mais recente
        tx({ type: "INCOME", date: "2026-06-25T00:00:00.000Z", amount: 8000, category: "Cachê", description: "Cachê atrasado" }),
        // vencida mais antiga, sem descrição
        tx({ type: "EXPENSE", date: "2026-06-10T00:00:00.000Z", amount: 5000, category: "Transporte", description: null }),
      ],
      { now: new Date(NOW) },
    );
    const lines = dueAgendaToCsv(agenda).split("\r\n");
    expect(lines).toHaveLength(4);
    // dentro de "Vencidas", a mais antiga (10/06) vem antes da mais recente (25/06)
    expect(lines[1]).toBe("10/06/2026;;Transporte;Vencidas;A pagar;-19;;0,00;50,00");
    expect(lines[2]).toBe("25/06/2026;Cachê atrasado;Cachê;Vencidas;A receber;-4;;80,00;0,00");
    expect(lines[3]).toBe("Total;;;;;;;80,00;50,00");
  });
});

describe("yearPaceToCsv", () => {
  // 15/jun/2026: meio do ano (espelha a fixture de yearToDatePace em finance.test).
  const NOW = "2026-06-15T00:00:00.000Z";
  const ytx = (date: string, amount: number, type: TxLike["type"] = "INCOME"): TxLike => ({
    type,
    amount,
    category: type === "INCOME" ? "Show" : "Transporte",
    date: `${date}T00:00:00.000Z`,
    received: false,
  });

  it("emite o cabeçalho e três linhas (Receitas/Despesas/Resultado) sem Total", () => {
    const csv = yearPaceToCsv(yearToDatePace([], { now: NOW }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(YEAR_PACE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(4); // cabeçalho + 3 métricas, sem linha Total
    expect(lines[1]).toBe("Receitas;0,00;0,00;"); // sem base → variação em branco
    expect(lines[2]).toBe("Despesas;0,00;0,00;");
    expect(lines[3]).toBe("Resultado;0,00;0,00;");
  });

  it("serializa o acumulado dos dois anos e a variação relativa com sinal", () => {
    const csv = yearPaceToCsv(
      yearToDatePace(
        [
          ytx("2026-02-01", 1000_00),
          ytx("2026-04-01", 200_00, "EXPENSE"),
          ytx("2025-02-01", 800_00),
          ytx("2025-04-01", 400_00, "EXPENSE"),
        ],
        { now: NOW },
      ),
    );
    const lines = csv.split("\r\n");
    // Receitas: 1000 vs 800 → +25%
    expect(lines[1]).toBe("Receitas;1000,00;800,00;+25%");
    // Despesas: 200 vs 400 → −50% (queda)
    expect(lines[2]).toBe("Despesas;200,00;400,00;-50%");
    // Resultado: 800 (1000−200) vs 400 (800−400) → +100%
    expect(lines[3]).toBe("Resultado;800,00;400,00;+100%");
  });

  it("deixa a variação em branco quando não há base no ano anterior", () => {
    const csv = yearPaceToCsv(yearToDatePace([ytx("2026-03-01", 500_00)], { now: NOW }));
    const lines = csv.split("\r\n");
    // Sem receita/despesa em 2025 até o corte → previous 0 → pct null → "".
    expect(lines[1]).toBe("Receitas;500,00;0,00;");
    expect(lines[3]).toBe("Resultado;500,00;0,00;");
  });
});

describe("breakEvenToCsv", () => {
  const NOW = "2026-06-15T00:00:00.000Z"; // junho/2026

  const btx = (over: Partial<TxLike> = {}): TxLike => ({
    type: "EXPENSE",
    amount: 300_00,
    category: "Sala",
    date: "2026-06-10T00:00:00.000Z",
    received: false,
    ...over,
  });

  // Custo fixo de R$ 300/mês: "Sala" repetida em abr/mai/jun.
  const fixedCostTxs: TxLike[] = [
    btx({ date: "2026-04-10T00:00:00.000Z" }),
    btx({ date: "2026-05-10T00:00:00.000Z" }),
    btx({ date: "2026-06-10T00:00:00.000Z" }),
  ];

  it("emite o cabeçalho e uma linha por métrica, na ordem da página", () => {
    // Dois shows de cachê 200 (net 200) em mai/jun → média 200, ritmo 1 show/mês,
    // meta ceil(300/200)=2 → não cobre.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-05-05T00:00:00.000Z" },
      { id: "s2", fee: 200_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
    ];
    const csv = breakEvenToCsv(computeBreakEven(shows, fixedCostTxs, { now: NOW }));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(BREAK_EVEN_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(7); // cabeçalho + 6 métricas, sem Total
    expect(lines[1]).toBe("Custo fixo mensal (R$);300,00");
    expect(lines[2]).toBe("Resultado médio por show (R$);200,00");
    expect(lines[3]).toBe("Shows realizados considerados;2");
    expect(lines[4]).toBe("Ritmo atual (shows/mês);1,0");
    expect(lines[5]).toBe("Shows/mês para o equilíbrio;2");
    expect(lines[6]).toBe("Cobre o custo fixo?;Não");
  });

  it("marca 'Sim' quando o ritmo atual já cobre a meta", () => {
    // Três shows num único mês (jun) → ritmo 3/mês; meta 2 → cobre.
    const shows: BreakEvenShowLike[] = [
      { id: "s1", fee: 200_00, status: "PLAYED", date: "2026-06-05T00:00:00.000Z" },
      { id: "s2", fee: 200_00, status: "PLAYED", date: "2026-06-10T00:00:00.000Z" },
      { id: "s3", fee: 200_00, status: "PLAYED", date: "2026-06-20T00:00:00.000Z" },
    ];
    const csv = breakEvenToCsv(computeBreakEven(shows, fixedCostTxs, { now: NOW }));
    const lines = csv.split("\r\n");
    expect(lines[4]).toBe("Ritmo atual (shows/mês);3,0");
    expect(lines[6]).toBe("Cobre o custo fixo?;Sim");
  });

  it("deixa a meta e o veredito em branco quando não são estimáveis", () => {
    // Custo fixo existe mas nenhum show realizado → showsNeeded/covered null.
    const csv = breakEvenToCsv(computeBreakEven([], fixedCostTxs, { now: NOW }));
    const lines = csv.split("\r\n");
    expect(lines[2]).toBe("Resultado médio por show (R$);0,00");
    expect(lines[3]).toBe("Shows realizados considerados;0");
    expect(lines[4]).toBe("Ritmo atual (shows/mês);0,0");
    expect(lines[5]).toBe("Shows/mês para o equilíbrio;"); // não estimável → branco
    expect(lines[6]).toBe("Cobre o custo fixo?;"); // idem
  });
});

describe("monthPaceToCsv", () => {
  // 15/jun/2026: metade de junho (30 dias) → elapsed = 0.5; janela típica = 6 meses
  // fechados (dez/2025 → mai/2026). Espelha a fixture de currentMonthPace.
  const NOW = "2026-06-15T00:00:00.000Z";
  const mtx = (date: string, amount: number, type: TxLike["type"] = "INCOME"): TxLike => ({
    type,
    amount,
    category: type === "INCOME" ? "Show" : "Transporte",
    date: `${date}T00:00:00.000Z`,
    received: false,
  });
  // 6 meses fechados, cada um com 1000_00 de receita → mês típico = 1000_00.
  const baseline1000 = (): TxLike[] =>
    ["2025-12", "2026-01", "2026-02", "2026-03", "2026-04", "2026-05"].map((mk) =>
      mtx(`${mk}-10`, 1000_00),
    );

  it("emite o cabeçalho e os dois eixos (mês típico + ano anterior) sem Total", () => {
    const pace = currentMonthPace([], { now: NOW });
    const yoy = monthYoYPace([], { now: NOW });
    const lines = monthPaceToCsv(pace, yoy).split("\r\n");
    expect(lines[0]).toBe(MONTH_PACE_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(7); // cabeçalho + 3 métricas × 2 eixos, sem Total
    // sem dados → tudo 0,00 e variação em branco (previous 0 → pct null)
    expect(lines[1]).toBe("Mês típico;Receitas;0,00;0,00;");
    expect(lines[4]).toBe("Mesmo mês do ano anterior;Receitas;0,00;0,00;");
  });

  it("serializa a projeção do mês contra o mês típico e o mesmo mês do ano anterior", () => {
    const txs = [...baseline1000(), mtx("2026-06-10", 500_00), mtx("2025-06-10", 800_00)];
    const pace = currentMonthPace(txs, { now: NOW });
    const yoy = monthYoYPace(txs, { now: NOW });
    const lines = monthPaceToCsv(pace, yoy).split("\r\n");
    // Projeção de junho = 500_00 ÷ 0,5 = 1000_00.
    // Mês típico: projeção 1000 vs baseline 1000 → 0%.
    expect(lines[1]).toBe("Mês típico;Receitas;1000,00;1000,00;0%");
    expect(lines[2]).toBe("Mês típico;Despesas;0,00;0,00;");
    expect(lines[3]).toBe("Mês típico;Resultado;1000,00;1000,00;0%");
    // Ano anterior: projeção 1000 vs jun/2025 cheio (800) → +25%.
    expect(lines[4]).toBe("Mesmo mês do ano anterior;Receitas;1000,00;800,00;+25%");
    expect(lines[5]).toBe("Mesmo mês do ano anterior;Despesas;0,00;0,00;");
    expect(lines[6]).toBe("Mesmo mês do ano anterior;Resultado;1000,00;800,00;+25%");
  });

  it("emite o eixo do ano anterior mesmo sem movimento no mês de referência (variação em branco)", () => {
    const txs = [...baseline1000(), mtx("2026-06-10", 500_00)]; // sem jun/2025
    const pace = currentMonthPace(txs, { now: NOW });
    const yoy = monthYoYPace(txs, { now: NOW });
    expect(yoy.lastYearHasMovement).toBe(false);
    const lines = monthPaceToCsv(pace, yoy).split("\r\n");
    expect(lines).toHaveLength(7); // o eixo do ano anterior continua presente
    // sem base no ano anterior → comparação 0,00 e variação em branco
    expect(lines[4]).toBe("Mesmo mês do ano anterior;Receitas;1000,00;0,00;");
    expect(lines[6]).toBe("Mesmo mês do ano anterior;Resultado;1000,00;0,00;");
  });
});

describe("monthlyReportToCsv", () => {
  const tx = (amount: number, type: TxLike["type"] = "INCOME", received = false): TxLike => ({
    type,
    amount,
    category: type === "INCOME" ? "Show" : "Transporte",
    date: "2026-06-10T00:00:00.000Z",
    received,
  });

  // Monta a view como a rota faz: resumo do mês + comparativos vs. mês anterior e
  // vs. a média dos meses recentes com movimento (a regra ≥2 da página).
  const view = (
    current: TxLike[],
    previous: TxLike[],
    trailing: TxLike[][],
  ): MonthlyReportCsvView => {
    const summary = summarizeFinances(current);
    const trailingSummaries = trailing.filter((m) => m.length > 0).map(summarizeFinances);
    return {
      summary,
      vsPreviousMonth: compareSummaries(summary, summarizeFinances(previous)),
      vsAverage: compareSummaries(summary, averageSummaries(trailingSummaries)),
      hasPreviousMonth: previous.length > 0,
      hasAverage: trailingSummaries.length >= 2,
      averageMonths: trailingSummaries.length,
    };
  };

  it("emite só a seção 'Mês atual' quando não há mês anterior nem média", () => {
    const csv = monthlyReportToCsv(view([tx(1000_00, "INCOME", true)], [], []));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(MONTHLY_REPORT_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(5); // cabeçalho + 4 métricas; sem eixos de comparação
    expect(lines[1]).toBe("Mês atual;Receitas;1000,00;;");
    expect(lines[2]).toBe("Mês atual;Despesas;0,00;;");
    expect(lines[3]).toBe("Mês atual;Saldo do mês;1000,00;;");
    expect(lines[4]).toBe("Mês atual;Caixa realizado;1000,00;;");
  });

  it("inclui as pendências do mês (a receber / a pagar) quando há valores em aberto", () => {
    // receita não recebida (a receber) + despesa não paga (a pagar)
    const csv = monthlyReportToCsv(view([tx(1000_00), tx(300_00, "EXPENSE")], [], []));
    const lines = csv.split("\r\n");
    expect(lines).toContain("Mês atual;A receber no mês;1000,00;;");
    expect(lines).toContain("Mês atual;A pagar no mês;300,00;;");
    // Caixa realizado é 0 (nada recebido/pago); o saldo de competência é 700.
    expect(lines).toContain("Mês atual;Saldo do mês;700,00;;");
    expect(lines).toContain("Mês atual;Caixa realizado;0,00;;");
  });

  it("emite os eixos 'Mês anterior' e 'Média' com a variação relativa", () => {
    const current = [tx(1000_00, "INCOME", true)];
    const previous = [tx(800_00, "INCOME", true)];
    // dois meses na janela da média: 800 e 1200 → média 1000
    const trailing = [[tx(800_00, "INCOME", true)], [tx(1200_00, "INCOME", true)]];
    const lines = monthlyReportToCsv(view(current, previous, trailing)).split("\r\n");
    expect(lines).toHaveLength(13); // 1 + 4 (mês atual) + 4 (mês ant.) + 4 (média)
    // Mês anterior: receita 1000 vs 800 → +25%
    expect(lines).toContain("Mês anterior;Receitas;1000,00;800,00;+25%");
    // Média (2 meses): receita 1000 vs média 1000 → 0%
    expect(lines).toContain("Média dos últimos 2 meses;Receitas;1000,00;1000,00;0%");
  });

  it("marca a variação como 'novo' quando a base do mês anterior é zero", () => {
    const current = [tx(500_00, "INCOME", true)];
    const previous = [tx(200_00, "EXPENSE", true)]; // sem receita no mês anterior
    const lines = monthlyReportToCsv(view(current, previous, [])).split("\r\n");
    // base 0 → pct null → "novo" (espelha o "novo" da UI); média ausente (< 2 meses)
    expect(lines).toContain("Mês anterior;Receitas;500,00;0,00;novo");
    expect(lines.some((l) => l.startsWith("Média"))).toBe(false);
  });
});

describe("monthlyGoalProgressToCsv", () => {
  // 15/jun/2026: ano corrente, mês 6 (jun) em andamento.
  const NOW = "2026-06-15T00:00:00.000Z";
  const inc = (date: string, amount: number, received = true): TxLike => ({
    type: "INCOME",
    amount,
    category: "Show",
    date: `${date}T00:00:00.000Z`,
    received,
  });

  it("emite cabeçalho, 12 meses (jan→dez) e linha Total", () => {
    const csv = monthlyGoalProgressToCsv(
      monthlyGoalProgress([], 2026, 1200_00, { now: NOW }),
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(MONTHLY_GOAL_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(14); // cabeçalho + 12 meses + Total
    expect(lines[1].startsWith("jan;")).toBe(true);
    expect(lines[12].startsWith("dez;")).toBe(true);
    expect(lines[13].startsWith("Total;")).toBe(true);
  });

  it("serializa alvo, recebido, falta, percentual e situação por mês", () => {
    // Meta 1200,00 → alvo de 100,00/mês. jan já encerrado e batido (120,00);
    // mar encerrado e abaixo (50,00); jun (corrente) em andamento sem receita.
    const csv = monthlyGoalProgressToCsv(
      monthlyGoalProgress(
        [inc("2026-01-10", 120_00), inc("2026-03-10", 50_00)],
        2026,
        1200_00,
        { now: NOW },
      ),
    );
    const lines = csv.split("\r\n");
    // jan: alvo 100,00, recebido 120,00, falta 0,00, 120%, Batido
    expect(lines[1]).toBe("jan;100,00;120,00;0,00;120%;Batido");
    // mar: alvo 100,00, recebido 50,00, falta 50,00, 50%, Abaixo (mês passado)
    expect(lines[3]).toBe("mar;100,00;50,00;50,00;50%;Abaixo");
    // jun (mês 6): corrente, sem receita → Em andamento
    expect(lines[6]).toBe("jun;100,00;0,00;100,00;0%;Em andamento");
    // jul (mês 7): futuro → A seguir
    expect(lines[7]).toBe("jul;100,00;0,00;100,00;0%;A seguir");
  });

  it("a linha Total traz a meta anual, o recebido somado e o resumo de batidos", () => {
    const csv = monthlyGoalProgressToCsv(
      monthlyGoalProgress(
        [inc("2026-01-10", 120_00), inc("2026-02-10", 110_00)],
        2026,
        1200_00,
        { now: NOW },
      ),
    );
    const lines = csv.split("\r\n");
    // Total: meta 1200,00, recebido 230,00, falta 970,00, participação em branco,
    // 2 meses batidos de 12.
    expect(lines[13]).toBe("Total;1200,00;230,00;970,00;;2/12 batidos");
  });

  it("sem meta (0) emite alvos zerados e Total 0/12 batidos", () => {
    const csv = monthlyGoalProgressToCsv(monthlyGoalProgress([], 2026, 0, { now: NOW }));
    const lines = csv.split("\r\n");
    // jan já encerrado, alvo 0 (sem meta) → "Abaixo" (target 0 nunca conta como batido).
    expect(lines[1]).toBe("jan;0,00;0,00;0,00;0%;Abaixo");
    expect(lines[13]).toBe("Total;0,00;0,00;0,00;;0/12 batidos");
  });
});

describe("quarterlyGoalProgressToCsv", () => {
  // 15/jun/2026: ano corrente, 2º trimestre (abr–jun) em andamento.
  const NOW = "2026-06-15T00:00:00.000Z";
  const inc = (date: string, amount: number, received = true): TxLike => ({
    type: "INCOME",
    amount,
    category: "Show",
    date: `${date}T00:00:00.000Z`,
    received,
  });

  it("emite cabeçalho, 4 trimestres (1º→4º) e linha Total", () => {
    const csv = quarterlyGoalProgressToCsv(
      quarterlyGoalProgress([], 2026, 1200_00, { now: NOW }),
    );
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(QUARTERLY_GOAL_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(6); // cabeçalho + 4 trimestres + Total
    expect(lines[1].startsWith("1º tri;")).toBe(true);
    expect(lines[4].startsWith("4º tri;")).toBe(true);
    expect(lines[5].startsWith("Total;")).toBe(true);
  });

  it("serializa alvo, recebido, falta, percentual e situação por trimestre", () => {
    // Meta 1200,00 → alvo de 300,00/tri. Q1 (jan–mar) encerrado e batido (320,00);
    // Q2 (abr–jun) corrente e abaixo (100,00); Q3/Q4 futuros.
    const csv = quarterlyGoalProgressToCsv(
      quarterlyGoalProgress(
        [inc("2026-02-10", 320_00), inc("2026-05-10", 100_00)],
        2026,
        1200_00,
        { now: NOW },
      ),
    );
    const lines = csv.split("\r\n");
    // Q1: alvo 300,00, recebido 320,00, falta 0,00, 107%, Batido
    expect(lines[1]).toBe("1º tri;300,00;320,00;0,00;107%;Batido");
    // Q2 (corrente): recebido 100,00, falta 200,00, 33%, Em andamento
    expect(lines[2]).toBe("2º tri;300,00;100,00;200,00;33%;Em andamento");
    // Q3 (futuro): A seguir
    expect(lines[3]).toBe("3º tri;300,00;0,00;300,00;0%;A seguir");
  });

  it("a linha Total traz a meta anual, o recebido somado e o resumo de batidos", () => {
    const csv = quarterlyGoalProgressToCsv(
      quarterlyGoalProgress(
        [inc("2026-02-10", 320_00), inc("2026-05-10", 320_00)],
        2026,
        1200_00,
        { now: NOW },
      ),
    );
    const lines = csv.split("\r\n");
    // Total: meta 1200,00, recebido 640,00, falta 560,00, participação em branco,
    // 2 trimestres batidos de 4 (Q1 e Q2 com 320,00 ≥ 300,00).
    expect(lines[5]).toBe("Total;1200,00;640,00;560,00;;2/4 batidos");
  });

  it("sem meta (0) emite alvos zerados e Total 0/4 batidos", () => {
    const csv = quarterlyGoalProgressToCsv(quarterlyGoalProgress([], 2026, 0, { now: NOW }));
    const lines = csv.split("\r\n");
    // Q1 já encerrado, alvo 0 (sem meta) → "Abaixo" (target 0 nunca conta como batido).
    expect(lines[1]).toBe("1º tri;0,00;0,00;0,00;0%;Abaixo");
    expect(lines[5]).toBe("Total;0,00;0,00;0,00;;0/4 batidos");
  });
});

describe("openWeekendsToCsv", () => {
  // 2026-03-13 é uma sexta → a janela ancora no próprio fim de semana 13–15 mar.
  const NOW = "2026-03-13";
  const mkShow = (
    date: string,
    over: Partial<ConflictShowLike> = {},
  ): ConflictShowLike => ({
    id: date,
    title: "Show",
    date,
    status: "CONFIRMED",
    ...over,
  });

  it("sem shows: todos os fins de semana ficam livres + Total", () => {
    const report = findOpenWeekends([], { now: NOW, weeks: 2 });
    const lines = openWeekendsToCsv(report).split("\r\n");
    expect(lines[0]).toBe(OPEN_WEEKENDS_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(4);
    expect(lines[1]).toBe("13/03/2026;15/03/2026;Livre;0;0,00");
    expect(lines[2]).toBe("20/03/2026;22/03/2026;Livre;0;0,00");
    expect(lines[3]).toBe("Total;;2/2 livres;0;0,00");
  });

  it("uma linha por fim de semana (livre/ocupado) com cachê somado + Total", () => {
    const report = findOpenWeekends(
      [
        mkShow("2026-03-14T20:00:00Z", { status: "PLAYED", fee: 150000 }),
        mkShow("2026-03-21T21:00:00Z", { fee: 200000 }),
        // Cancelado no 3º fim de semana → não ocupa a data (segue livre).
        mkShow("2026-03-28T22:00:00Z", { status: "CANCELLED", fee: 999999 }),
      ],
      { now: NOW, weeks: 3 },
    );
    const lines = openWeekendsToCsv(report).split("\r\n");
    expect(lines).toHaveLength(5);
    expect(lines[1]).toBe("13/03/2026;15/03/2026;Ocupado;1;1500,00");
    expect(lines[2]).toBe("20/03/2026;22/03/2026;Ocupado;1;2000,00");
    expect(lines[3]).toBe("27/03/2026;29/03/2026;Livre;0;0,00");
    // Total: só 1 livre de 3; soma os shows e os cachês marcados da janela.
    expect(lines[4]).toBe("Total;;1/3 livres;2;3500,00");
  });

  it("show sem cachê conta como ocupado com 0; cancelado não ocupa", () => {
    const report = findOpenWeekends(
      [
        mkShow("2026-03-14T20:00:00Z"), // sem fee
        mkShow("2026-03-15T19:00:00Z", { status: "CANCELLED", fee: 500000 }),
      ],
      { now: NOW, weeks: 1 },
    );
    const lines = openWeekendsToCsv(report).split("\r\n");
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe("13/03/2026;15/03/2026;Ocupado;1;0,00");
    expect(lines[2]).toBe("Total;;0/1 livres;1;0,00");
  });
});

describe("scheduleConflictsToCsv", () => {
  // 2026-03-15 como "hoje" para separar dias acionáveis (≥ hoje) dos passados.
  const NOW = "2026-03-15";
  const mkShow = (
    id: string,
    date: string,
    over: Partial<ConflictShowLike> = {},
  ): ConflictShowLike => ({
    id,
    title: id,
    date,
    status: "CONFIRMED",
    ...over,
  });

  it("sem conflitos: só cabeçalho + Total zerado", () => {
    const report = findScheduleConflicts(
      [mkShow("a", "2026-03-20T20:00:00Z")],
      { now: NOW },
    );
    const lines = scheduleConflictsToCsv(report).split("\r\n");
    expect(lines[0]).toBe(SCHEDULE_CONFLICTS_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0/0 a resolver;;;;;;0,00");
  });

  it("uma linha por show envolvido, ordenada por dia e horário + Total", () => {
    const report = findScheduleConflicts(
      [
        // Dia futuro com 2 shows (a resolver) — fora de ordem cronológica na entrada.
        mkShow("noite", "2026-03-20T22:00:00Z", {
          venue: "Bar X",
          city: "Recife",
          fee: 200000,
        }),
        mkShow("matine", "2026-03-20T15:00:00Z", {
          venue: "Praça",
          city: "Recife",
          status: "PROPOSED",
          fee: 50000,
        }),
        // Dia passado com 2 shows (já vivido).
        mkShow("passado1", "2026-03-10T20:00:00Z", { fee: 100000 }),
        mkShow("passado2", "2026-03-10T21:00:00Z"),
        // Dia sem conflito → não entra.
        mkShow("solo", "2026-03-25T20:00:00Z", { fee: 999999 }),
      ],
      { now: NOW },
    );
    const lines = scheduleConflictsToCsv(report).split("\r\n");
    // 1 cabeçalho + 4 shows (2 dias em conflito) + Total.
    expect(lines).toHaveLength(6);
    // Dias em ordem cronológica: 10/03 (passado) antes de 20/03 (a resolver).
    expect(lines[1]).toBe("10/03/2026;Passado;passado1;20:00;;;Confirmado;1000,00");
    expect(lines[2]).toBe("10/03/2026;Passado;passado2;21:00;;;Confirmado;0,00");
    // Dentro do dia, a matinê (15:00) vem antes da noite (22:00).
    expect(lines[3]).toBe(
      "20/03/2026;A resolver;matine;15:00;Praça;Recife;Proposto;500,00",
    );
    expect(lines[4]).toBe(
      "20/03/2026;A resolver;noite;22:00;Bar X;Recife;Confirmado;2000,00",
    );
    // Total: 1 de 2 dias ainda por resolver; soma só os cachês dos envolvidos
    // (o "solo" de 9999,99 fica de fora por não conflitar).
    expect(lines[5]).toBe("Total;1/2 a resolver;;;;;;3500,00");
  });

  it("cancelados não conflitam (excluídos pela lógica pura)", () => {
    const report = findScheduleConflicts(
      [
        mkShow("real", "2026-03-20T20:00:00Z", { fee: 100000 }),
        mkShow("cancelado", "2026-03-20T21:00:00Z", {
          status: "CANCELLED",
          fee: 500000,
        }),
      ],
      { now: NOW },
    );
    const lines = scheduleConflictsToCsv(report).split("\r\n");
    // O dia tem só 1 show não cancelado → não é conflito; só cabeçalho + Total.
    expect(lines).toHaveLength(2);
    expect(lines[1]).toBe("Total;0/0 a resolver;;;;;;0,00");
  });
});

describe("funnelActivityFeedToCsv", () => {
  it("feed vazio: só o cabeçalho", () => {
    const lines = funnelActivityFeedToCsv(buildFunnelActivityFeed([])).split(
      "\r\n",
    );
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_CSV_HEADERS.join(";"));
  });

  it("uma linha por transição, mais recente primeiro, com natureza e status pt-BR", () => {
    const feed = buildFunnelActivityFeed([
      {
        showId: "s1",
        showTitle: "Show no Bar",
        showDate: "2026-04-10T20:00:00Z",
        fromStatus: null,
        toStatus: "PROPOSED",
        at: "2026-03-01T09:00:00Z",
      },
      {
        showId: "s1",
        showTitle: "Show no Bar",
        showDate: "2026-04-10T20:00:00Z",
        fromStatus: "PROPOSED",
        toStatus: "CONFIRMED",
        at: "2026-03-05T14:30:00Z",
      },
    ]);
    const lines = funnelActivityFeedToCsv(feed).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_CSV_HEADERS.join(";"));
    // 2 transições, mais recente (05/03) antes da mais antiga (01/03).
    expect(lines).toHaveLength(3);
    expect(lines[1]).toBe(
      "05/03/2026;14:30;Show no Bar;Avançou;Proposto;Confirmado;10/04/2026",
    );
    // Cadastro: "De" vazio (sem status anterior), natureza "Cadastro".
    expect(lines[2]).toBe(
      "01/03/2026;09:00;Show no Bar;Cadastro;;Proposto;10/04/2026",
    );
  });

  it("cancelar/reabrir e data do show ausente saem corretos", () => {
    const feed = buildFunnelActivityFeed([
      {
        showId: "s2",
        showTitle: "Gig sem data",
        showDate: null,
        fromStatus: "CONFIRMED",
        toStatus: "CANCELLED",
        at: "2026-02-01T10:00:00Z",
      },
      {
        showId: "s2",
        showTitle: "Gig sem data",
        showDate: null,
        fromStatus: "CANCELLED",
        toStatus: "PROPOSED",
        at: "2026-02-02T10:00:00Z",
      },
    ]);
    const lines = funnelActivityFeedToCsv(feed).split("\r\n");
    expect(lines[1]).toBe(
      "02/02/2026;10:00;Gig sem data;Reabriu;Cancelado;Proposto;",
    );
    expect(lines[2]).toBe(
      "01/02/2026;10:00;Gig sem data;Cancelou;Confirmado;Cancelado;",
    );
  });
});

describe("funnelActivityMonthlyToCsv", () => {
  it("sem meses: só o cabeçalho", () => {
    const lines = funnelActivityMonthlyToCsv([]).split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_MONTHLY_CSV_HEADERS.join(";"));
  });

  it("uma linha por mês (recente→antigo), mês por extenso pt-BR e contagens por natureza", () => {
    const feed = buildFunnelActivityFeed([
      { showId: "a", showTitle: "A", showDate: null, fromStatus: null, toStatus: "PROPOSED", at: "2026-03-02T09:00:00Z" },
      { showId: "b", showTitle: "B", showDate: null, fromStatus: "PROPOSED", toStatus: "CONFIRMED", at: "2026-03-20T18:00:00Z" },
      { showId: "c", showTitle: "C", showDate: null, fromStatus: "CONFIRMED", toStatus: "CANCELLED", at: "2026-02-11T12:00:00Z" },
    ]);
    const months = groupFunnelActivityByMonth(feed);
    const lines = funnelActivityMonthlyToCsv(months).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_MONTHLY_CSV_HEADERS.join(";"));
    expect(lines).toHaveLength(3);
    // março: 2 transições (1 cadastro + 1 avanço); depois fevereiro: 1 cancelamento.
    expect(lines[1]).toBe("Março de 2026;2;1;1;0;0;0");
    expect(lines[2]).toBe("Fevereiro de 2026;1;0;0;0;1;0");
  });
});

describe("funnelActivityComparisonToCsv", () => {
  it("dois períodos vazios: as cinco naturezas zeradas + Total (só o cabeçalho tem sentido de dados)", () => {
    const cmp = compareFunnelActivityMonths([], []);
    const lines = funnelActivityComparisonToCsv(cmp).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_COMPARISON_CSV_HEADERS.join(";"));
    // cabeçalho + 5 naturezas + Total.
    expect(lines).toHaveLength(7);
    expect(lines[1]).toBe("Cadastros;0;0;0");
    expect(lines[6]).toBe("Total;0;0;0");
  });

  it("uma linha por natureza (ordem canônica) com contagens dos dois anos e Δ assinado + Total", () => {
    // 2026 (atual): 2 cadastros + 1 avanço = 3 transições.
    const current = groupFunnelActivityByMonth(
      buildFunnelActivityFeed([
        { showId: "a", showTitle: "", showDate: null, fromStatus: null, toStatus: "PROPOSED", at: "2026-03-02T09:00:00Z" },
        { showId: "b", showTitle: "", showDate: null, fromStatus: null, toStatus: "PROPOSED", at: "2026-04-05T09:00:00Z" },
        { showId: "c", showTitle: "", showDate: null, fromStatus: "PROPOSED", toStatus: "CONFIRMED", at: "2026-04-20T18:00:00Z" },
      ]),
    );
    // 2025 (anterior): 1 cadastro + 1 cancelamento = 2 transições.
    const previous = groupFunnelActivityByMonth(
      buildFunnelActivityFeed([
        { showId: "d", showTitle: "", showDate: null, fromStatus: null, toStatus: "PROPOSED", at: "2025-05-02T09:00:00Z" },
        { showId: "e", showTitle: "", showDate: null, fromStatus: "CONFIRMED", toStatus: "CANCELLED", at: "2025-06-11T12:00:00Z" },
      ]),
    );
    const cmp = compareFunnelActivityMonths(current, previous);
    const lines = funnelActivityComparisonToCsv(cmp).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_COMPARISON_CSV_HEADERS.join(";"));
    // Natureza;anterior;corrente;Δ — ordem canônica create/advance/regress/cancel/reopen.
    expect(lines[1]).toBe("Cadastros;1;2;+1");
    expect(lines[2]).toBe("Avanços;0;1;+1");
    expect(lines[3]).toBe("Recuos;0;0;0");
    expect(lines[4]).toBe("Cancelamentos;1;0;-1");
    expect(lines[5]).toBe("Reaberturas;0;0;0");
    expect(lines[6]).toBe("Total;2;3;+1");
  });
});

describe("funnelActivitySeasonalityToCsv", () => {
  const feedOf = (
    events: { showId: string; fromStatus: string | null; toStatus: string; at: string }[],
  ) =>
    buildFunnelActivityFeed(
      events.map((e) => ({
        showId: e.showId,
        showTitle: "",
        showDate: null,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        at: e.at,
      })),
    );

  it("feed vazio: cabeçalho + 12 meses zerados + Total", () => {
    const lines = funnelActivitySeasonalityToCsv(
      funnelActivitySeasonality([]),
    ).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_SEASONALITY_CSV_HEADERS.join(";"));
    // cabeçalho + 12 meses + Total.
    expect(lines).toHaveLength(14);
    // Janeiro zerado: sem anos, média/ano "0,0", 0% e sem destaque (última coluna vazia).
    expect(lines[1]).toBe("Janeiro;0;0;0,0;0%;0;0;0;0;0;");
    expect(lines[13]).toBe("Total;0;0;;;0;0;0;0;0;");
  });

  it("uma linha por mês (jan→dez) com total, média/ano, participação, naturezas e destaque", () => {
    const season = funnelActivitySeasonality(
      feedOf([
        // Fevereiro em dois anos: 2 cadastros + 1 avanço = 3 transições, 2 anos ativos.
        { showId: "a", fromStatus: null, toStatus: "PROPOSED", at: "2024-02-10T09:00:00Z" },
        { showId: "b", fromStatus: null, toStatus: "PROPOSED", at: "2025-02-20T09:00:00Z" },
        { showId: "c", fromStatus: "PROPOSED", toStatus: "CONFIRMED", at: "2025-02-25T09:00:00Z" },
        // Agosto: 1 cancelamento, 1 ano ativo.
        { showId: "d", fromStatus: "CONFIRMED", toStatus: "CANCELLED", at: "2025-08-11T12:00:00Z" },
      ]),
    );
    const lines = funnelActivitySeasonalityToCsv(season).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_SEASONALITY_CSV_HEADERS.join(";"));
    // Fevereiro (índice 2 nas linhas: cabeçalho + Janeiro): total 3, 2 anos, 1,5/ano, 75%.
    expect(lines[2]).toBe("Fevereiro;3;2;1,5;75%;2;1;0;0;0;Mês mais movimentado");
    // Agosto (8º mês): total 1, 1 ano, 1,0/ano, 25%, cancelamento, mais calmo.
    expect(lines[8]).toBe("Agosto;1;1;1,0;25%;0;0;0;1;0;Mês mais calmo");
    // Total: 4 transições, 2 anos observados, participação/média/destaque em branco.
    expect(lines[13]).toBe("Total;4;2;;;2;1;0;1;0;");
  });
});

describe("funnelActivitySeasonalityStallToCsv", () => {
  const seasonOf = (
    events: { fromStatus: string | null; toStatus: string; at: string }[],
  ) =>
    funnelActivitySeasonality(
      buildFunnelActivityFeed(
        events.map((e, i) => ({
          showId: `s${i}`,
          showTitle: "",
          showDate: null,
          fromStatus: e.fromStatus,
          toStatus: e.toStatus,
          at: e.at,
        })),
      ),
    );

  // N cadastros no mês `month` (0-based) de um ano PASSADO — o histórico contra o
  // qual o mês corrente do ano seguinte é medido (espelha `spikeIn` de shows.test).
  const spikeIn = (month: number, count: number, year = 2024) =>
    Array.from({ length: count }, (_, i) => ({
      fromStatus: null as string | null,
      toStatus: "PROPOSED",
      at: `${year}-${String(month + 1).padStart(2, "0")}-${String((i % 28) + 1).padStart(2, "0")}T09:00:00.000Z`,
    }));

  it("traz só o cabeçalho quando o funil não está parado num mês forte", () => {
    // Amostra abaixo do piso (11 < 12) → stall.month é null.
    const stall = funnelActivitySeasonalityStall(seasonOf(spikeIn(0, 11)), 0, {
      now: "2025-01-15T00:00:00.000Z",
    });
    expect(stall.month).toBeNull();
    const lines = funnelActivitySeasonalityStallToCsv(stall).split("\r\n");
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_SEASONALITY_STALL_CSV_HEADERS.join(";"));
  });

  it("serializa o mês forte parado com realizado × esperado e o shortfall", () => {
    // Janeiro é o único mês com movimento (60 transições em 2024) → forte, lift 12×.
    // Em 15/jan/2025, ~48% do mês decorreu; esperado ≈ 60×15/31 ≈ 29,0; real = 3.
    const stall = funnelActivitySeasonalityStall(seasonOf(spikeIn(0, 60)), 3, {
      now: "2025-01-15T00:00:00.000Z",
    });
    expect(stall.show).toBe(true);
    const lines = funnelActivitySeasonalityStallToCsv(stall).split("\r\n");
    expect(lines[0]).toBe("Indicador;Valor");
    expect(lines[1]).toBe("Mês forte;Janeiro");
    // share = 1.0 → lift 12× → (12−1)×100 = 1100%.
    expect(lines[2]).toBe("Concentra acima do mês médio (%);1100%");
    expect(lines[3]).toBe("Realizadas até agora;3");
    // 60×15/31 = 29,032… → csvCountAvg → "29,0".
    expect(lines[4]).toBe("Esperadas a esta altura;29,0");
    // shortfall = 1 − 3/29,03 ≈ 0,897 → 90%.
    expect(lines[5]).toBe("Abaixo do ritmo esperado (%);90%");
    expect(lines).toHaveLength(6);
  });
});

describe("funnelActivitySeasonalityComparisonToCsv", () => {
  const feedOf = (
    events: { showId: string; fromStatus: string | null; toStatus: string; at: string }[],
  ) =>
    buildFunnelActivityFeed(
      events.map((e) => ({
        showId: e.showId,
        showTitle: "",
        showDate: null,
        fromStatus: e.fromStatus,
        toStatus: e.toStatus,
        at: e.at,
      })),
    );
  // Comparativo entre um "ano corrente" e um "ano anterior" a partir de duas listas
  // de eventos já separadas por período.
  const compare = (
    current: { showId: string; fromStatus: string | null; toStatus: string; at: string }[],
    previous: { showId: string; fromStatus: string | null; toStatus: string; at: string }[],
  ) =>
    compareFunnelActivitySeasonality(
      funnelActivitySeasonality(feedOf(current)),
      funnelActivitySeasonality(feedOf(previous)),
    );

  it("dois períodos vazios: cabeçalho + 12 meses zerados (Estável) + Total", () => {
    const lines = funnelActivitySeasonalityComparisonToCsv(compare([], [])).split("\r\n");
    expect(lines[0]).toBe(FUNNEL_ACTIVITY_SEASONALITY_COMPARISON_CSV_HEADERS.join(";"));
    // cabeçalho + 12 meses + Total.
    expect(lines).toHaveLength(14);
    // Meses sem transições nos dois anos: 0/0, Δ "0", tendência "Estável".
    expect(lines[1]).toBe("Janeiro;0;0;0;Estável");
    expect(lines[12]).toBe("Dezembro;0;0;0;Estável");
    // Total: colunas de contagem em branco, Δ zerado, sem tendência.
    expect(lines[13]).toBe("Total;;;0;");
  });

  it("uma linha por mês (jan→dez) com transições dos dois anos, Δ assinado e tendência", () => {
    // Março: 2 transições em 2026 (corrente) vs. 1 em 2025 (anterior) → subiu.
    // Julho: 1 em 2026 vs. 2 em 2025 → caiu.
    const comparison = compare(
      [
        { showId: "a", fromStatus: null, toStatus: "PROPOSED", at: "2026-03-01T09:00:00Z" },
        { showId: "b", fromStatus: "PROPOSED", toStatus: "CONFIRMED", at: "2026-03-20T09:00:00Z" },
        { showId: "c", fromStatus: null, toStatus: "PROPOSED", at: "2026-07-04T09:00:00Z" },
      ],
      [
        { showId: "d", fromStatus: null, toStatus: "PROPOSED", at: "2025-03-15T09:00:00Z" },
        { showId: "e", fromStatus: null, toStatus: "PROPOSED", at: "2025-07-04T09:00:00Z" },
        { showId: "f", fromStatus: "CONFIRMED", toStatus: "CANCELLED", at: "2025-07-20T12:00:00Z" },
      ],
    );
    const lines = funnelActivitySeasonalityComparisonToCsv(comparison).split("\r\n");
    // Março (índice 3: cabeçalho + Jan + Fev + Mar): anterior 1, corrente 2, Δ +1, Subiu.
    expect(lines[3]).toBe("Março;1;2;+1;Subiu");
    // Julho (índice 7): anterior 2, corrente 1, Δ -1, Caiu.
    expect(lines[7]).toBe("Julho;2;1;-1;Caiu");
    // Total: 3 transições nos dois anos → Δ 0, contagens/tendência em branco.
    expect(lines[13]).toBe("Total;;;0;");
  });
});

describe("yearEndProjectionToCsv", () => {
  // 15/jun/2026: meio do ano corrente, para que shows futuros do ano contem.
  const NOW = "2026-06-15T00:00:00.000Z";
  const tx = (
    date: string,
    amount: number,
    type: TxLike["type"] = "INCOME",
    received = false,
    showId: string | null = null,
  ): TxLike => ({
    type,
    amount,
    category: "",
    date: `${date}T00:00:00.000Z`,
    received,
    showId,
  });
  const show = (
    id: string,
    fee: number,
    date: string,
    status?: string,
  ): YearEndShowLike => ({ id, fee, date: `${date}T00:00:00.000Z`, status });

  // Receita: 1000 já recebido + 300 pendente lançado + 2 shows futuros (700
  // confirmado, 500 a confirmar). Despesa: 1000 pago + 100 pendente, com uma
  // recorrência mar/abr/mai (≤ 2 meses antes de jun) que mantém o custo fixo
  // "ativo" p/ alimentar o piso do "pior caso".
  const txs: TxLike[] = [
    tx("2026-01-10", 1000_00, "INCOME", true),
    tx("2026-02-10", 300_00, "INCOME", false),
    tx("2026-01-15", 400_00, "EXPENSE", true),
    tx("2026-02-15", 100_00, "EXPENSE", false),
    tx("2026-03-05", 200_00, "EXPENSE", true),
    tx("2026-04-05", 200_00, "EXPENSE", true),
    tx("2026-05-05", 200_00, "EXPENSE", true),
  ];
  const shows: YearEndShowLike[] = [
    show("s1", 700_00, "2026-09-01", "CONFIRMED"),
    show("s2", 500_00, "2026-10-01", "PROPOSED"),
  ];

  const viewFor = (mode: Parameters<typeof yearEndScenarioView>[3]) =>
    yearEndScenarioView(
      projectYearEnd(txs, shows, 2026, { now: NOW }),
      txs,
      recurringExpenses(txs).estimatedMonthlyFixedCost,
      mode,
      { now: NOW },
    );

  it("emite cabeçalho e a composição agrupada (otimista, sem custo fixo)", () => {
    const csv = yearEndProjectionToCsv(viewFor("optimistic"));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(YEAR_END_PROJECTION_CSV_HEADERS.join(";"));
    // No otimista não há linha de custo fixo → 4 linhas de receita (incl. total)
    // + 3 de despesa (incl. total) + 1 de resultado = 8, mais o cabeçalho = 9.
    // Receitas: 1000 recebido / 300 pendente / 1200 agendado (700+500) / 2500 total.
    expect(lines[1]).toBe("Receitas;Já recebido;1000,00;40%");
    expect(lines[2]).toBe("Receitas;A receber (lançado);300,00;12%");
    expect(lines[3]).toBe("Receitas;Cachês agendados;1200,00;48%");
    expect(lines[4]).toBe("Receitas;Total projetado;2500,00;");
    // Despesas: pago = 400 + 3×200 = 1000; pendente = 100; total = 1100.
    expect(lines[5]).toBe("Despesas;Já pago;1000,00;91%");
    expect(lines[6]).toBe("Despesas;A pagar (lançado);100,00;9%");
    expect(lines[7]).toBe("Despesas;Total projetado;1100,00;");
    // Resultado projetado = 2500 − 1100 = 1400.
    expect(lines[8]).toBe("Resultado;Resultado projetado;1400,00;");
    expect(lines).toHaveLength(9);
  });

  it("descarta os cachês a confirmar no conservador (sem custo fixo)", () => {
    const csv = yearEndProjectionToCsv(viewFor("conservative"));
    const lines = csv.split("\r\n");
    // Agendado cai para só o confirmado (700) → receita total 2000.
    expect(lines[3]).toBe("Receitas;Cachês agendados;700,00;35%");
    expect(lines[4]).toBe("Receitas;Total projetado;2000,00;");
    // Despesas inalteradas; sem linha de custo fixo.
    expect(lines[7]).toBe("Despesas;Total projetado;1100,00;");
    expect(lines[8]).toBe("Resultado;Resultado projetado;900,00;");
    expect(lines).toHaveLength(9);
  });

  it("adiciona a linha de custo fixo estimado no pior caso", () => {
    const csv = yearEndProjectionToCsv(viewFor("pessimistic"));
    const lines = csv.split("\r\n");
    // Receita conservadora (só confirmado): total 2000.
    expect(lines[4]).toBe("Receitas;Total projetado;2000,00;");
    // Despesa ganha a linha de custo fixo estimado (recorrente futuro) ANTES do total.
    expect(lines[5]).toMatch(/^Despesas;Já pago;1000,00;/);
    expect(lines[6]).toMatch(/^Despesas;A pagar \(lançado\);100,00;/);
    expect(lines[7]).toMatch(/^Despesas;Custo fixo estimado;/);
    expect(lines[8]).toMatch(/^Despesas;Total projetado;/);
    expect(lines[9]).toMatch(/^Resultado;Resultado projetado;/);
    expect(lines).toHaveLength(10); // +1 linha vs. otimista por causa do custo fixo
  });

  it("usa participação 0% quando não há receita nem despesa projetada", () => {
    const csv = yearEndProjectionToCsv(
      yearEndScenarioView(projectYearEnd([], [], 2026, { now: NOW }), [], 0, "optimistic", {
        now: NOW,
      }),
    );
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Receitas;Já recebido;0,00;0%");
    expect(lines[4]).toBe("Receitas;Total projetado;0,00;");
    expect(lines[8]).toBe("Resultado;Resultado projetado;0,00;");
  });
});

function leadCsvShow(partial: Partial<LeadTimeShowLike>): LeadTimeShowLike {
  return {
    status: "CONFIRMED",
    createdAt: "2026-01-01T00:00:00.000Z",
    date: "2026-02-01T00:00:00.000Z",
    fee: 100_00,
    ...partial,
  };
}

describe("bookingLeadTimeToCsv", () => {
  it("emite só o cabeçalho + Total zerado quando não há amostra", () => {
    const csv = bookingLeadTimeToCsv(bookingLeadTime([]));
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(BOOKING_LEAD_TIME_CSV_HEADERS.join(";"));
    // 4 faixas sempre presentes, todas zeradas, + Total.
    expect(lines).toHaveLength(6);
    expect(lines[1]).toBe("Até 1 semana;0;7;0;0%;0,00");
    expect(lines[4]).toBe("Mais de 3 meses;91;;0;0%;0,00");
    expect(lines[5]).toBe("Total;;;0;;0,00");
  });

  it("uma linha por faixa com limites, contagem, participação e cachê + Total", () => {
    const csv = bookingLeadTimeToCsv(
      bookingLeadTime([
        leadCsvShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-04T00:00:00.000Z", fee: 100_00 }), // 3 → Até 1 semana
        leadCsvShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-01-21T00:00:00.000Z", fee: 200_00 }), // 20 → 1 a 4 semanas
        leadCsvShow({ createdAt: "2026-01-01T00:00:00.000Z", date: "2026-06-01T00:00:00.000Z", fee: 300_00 }), // 151 → Mais de 3 meses
      ]),
    );
    const lines = csv.split("\r\n");
    expect(lines[1]).toBe("Até 1 semana;0;7;1;33%;100,00");
    expect(lines[2]).toBe("1 a 4 semanas;8;30;1;33%;200,00");
    expect(lines[3]).toBe("1 a 3 meses;31;90;0;0%;0,00");
    expect(lines[4]).toBe("Mais de 3 meses;91;;1;33%;300,00");
    expect(lines[5]).toBe("Total;;;3;;600,00");
  });
});

describe("bookingLeadTimeComparisonToCsv", () => {
  // Constrói uma antecedência com médias/medianas limpas a partir de leads em dias.
  const leadOf = (createdAt: string, leadDays: number[]) =>
    bookingLeadTime(
      leadDays.map((d) => {
        const start = new Date(createdAt);
        const date = new Date(start.getTime() + d * 24 * 60 * 60 * 1000);
        return leadCsvShow({ createdAt, date: date.toISOString() });
      }),
    );

  it("transpõe o comparativo em linhas por métrica + linha de veredito", () => {
    // prev [10,20,30] → mediana/média 20; cur [30,40,50] → 40. Sobe > 7 dias → melhora.
    const cmp = compareBookingLeadTime(
      leadOf("2026-01-01T00:00:00.000Z", [30, 40, 50]),
      leadOf("2025-01-01T00:00:00.000Z", [10, 20, 30]),
    );
    const lines = bookingLeadTimeComparisonToCsv(cmp).split("\r\n");
    expect(lines[0]).toBe("Métrica;Ano anterior;Ano corrente;Δ;Δ %");
    expect(lines[0]).toBe(BOOKING_LEAD_TIME_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines[1]).toBe("Antecedência mediana (dias);20;40;+20;+100%");
    expect(lines[2]).toBe("Antecedência média (dias);20;40;+20;+100%");
    expect(lines[3]).toBe("Shows na amostra;3;3;0;0%");
    expect(lines[4]).toBe("Veredito;Agendando com mais folga;;;");
  });

  it("emite deltas e porcentagens negativos quando a antecedência cai", () => {
    // prev mediana 40; cur mediana 10 → cai 30 dias → piora; amostra 4 → 2.
    const cmp = compareBookingLeadTime(
      leadOf("2026-01-01T00:00:00.000Z", [5, 15]),
      leadOf("2025-01-01T00:00:00.000Z", [30, 40, 50, 60]),
    );
    const lines = bookingLeadTimeComparisonToCsv(cmp).split("\r\n");
    expect(lines[1]).toBe("Antecedência mediana (dias);45;10;-35;-78%");
    expect(lines[3]).toBe("Shows na amostra;4;2;-2;-50%");
    expect(lines[4]).toBe("Veredito;Agendando em cima da hora;;;");
  });

  it("deixa o Δ % vazio quando o ano anterior não tem base (mediana 0)", () => {
    // prev sem amostra → medianDays/avgDays/sample = 0; cur com amostra.
    const cmp = compareBookingLeadTime(
      leadOf("2026-01-01T00:00:00.000Z", [30, 40, 50]),
      bookingLeadTime([]),
    );
    const lines = bookingLeadTimeComparisonToCsv(cmp).split("\r\n");
    // Δ absoluto presente; Δ % (última coluna) vazio.
    expect(lines[1]).toBe("Antecedência mediana (dias);0;40;+40;");
    expect(lines[3]).toBe("Shows na amostra;0;3;+3;");
  });

  it("rotula o veredito estável quando a variação fica dentro do limiar", () => {
    // prev mediana 20; cur mediana 22 → +2 dias (< 7) → estável.
    const cmp = compareBookingLeadTime(
      leadOf("2026-01-01T00:00:00.000Z", [12, 22, 32]),
      leadOf("2025-01-01T00:00:00.000Z", [10, 20, 30]),
    );
    const lines = bookingLeadTimeComparisonToCsv(cmp).split("\r\n");
    expect(lines[4]).toBe("Veredito;Estável;;;");
  });
});

describe("paymentLagComparisonToCsv", () => {
  // Constrói um `paymentLag` a partir de uma lista de prazos (dias) — um show por
  // prazo, todos com o mesmo cachê pago à vista, de modo que a mediana/média
  // ponderadas pelo valor coincidem com a mediana/média simples dos prazos e o
  // `showCount` é o tamanho da lista. Espelha o `lagOfDays` de finance.test.ts,
  // generalizado para vários shows.
  const lagOf = (days: number[]) => {
    const shows: ReceivableShowLike[] = days.map((_d, i) => ({
      id: `g${i}`,
      fee: 100_00,
      status: "PLAYED",
      date: "2026-03-01T00:00:00.000Z",
    }));
    const txs: TxLike[] = days.map((d, i) => ({
      type: "INCOME",
      amount: 100_00,
      category: "cachê",
      date: new Date(Date.UTC(2026, 2, 1 + d)).toISOString(),
      received: true,
      showId: `g${i}`,
    }));
    return paymentLag(shows, txs);
  };

  it("transpõe o comparativo em linhas por métrica + linha de veredito", () => {
    // prev [10,20,30] → mediana/média 20; cur [30,40,50] → 40. Sobe 20 d (>7) →
    // recebendo mais DEVAGAR (piora, pois aqui descer é a melhora).
    const cmp = comparePaymentLag(lagOf([30, 40, 50]), lagOf([10, 20, 30]));
    const lines = paymentLagComparisonToCsv(cmp).split("\r\n");
    expect(lines[0]).toBe("Métrica;Ano anterior;Ano corrente;Δ;Δ %");
    expect(lines[0]).toBe(PAYMENT_LAG_COMPARISON_CSV_HEADERS.join(";"));
    expect(lines[1]).toBe("Prazo mediano (dias);20;40;+20;+100%");
    expect(lines[2]).toBe("Prazo médio (dias);20;40;+20;+100%");
    expect(lines[3]).toBe("Shows analisados;3;3;0;0%");
    expect(lines[4]).toBe("Veredito;Recebendo mais devagar;;;");
  });

  it("emite deltas e porcentagens negativos quando o prazo cai (recebendo mais rápido)", () => {
    // prev mediana 45; cur mediana 10 → cai 35 d (>7) → recebendo mais RÁPIDO
    // (melhora). Amostra 4 → 2.
    const cmp = comparePaymentLag(lagOf([5, 15]), lagOf([30, 40, 50, 60]));
    const lines = paymentLagComparisonToCsv(cmp).split("\r\n");
    expect(lines[1]).toBe("Prazo mediano (dias);45;10;-35;-78%");
    expect(lines[3]).toBe("Shows analisados;4;2;-2;-50%");
    expect(lines[4]).toBe("Veredito;Recebendo mais rápido;;;");
  });

  it("deixa o Δ % vazio quando o ano anterior não tem base (prazo 0)", () => {
    // prev sem shows recebidos → medianDays/avgDays/showCount = 0; cur com amostra.
    const cmp = comparePaymentLag(lagOf([30, 40, 50]), lagOf([]));
    const lines = paymentLagComparisonToCsv(cmp).split("\r\n");
    // Δ absoluto presente; Δ % (última coluna) vazio.
    expect(lines[1]).toBe("Prazo mediano (dias);0;40;+40;");
    expect(lines[3]).toBe("Shows analisados;0;3;+3;");
  });

  it("rotula o veredito estável quando a variação fica dentro do limiar", () => {
    // prev mediana 20; cur mediana 22 → +2 dias (< 7) → estável.
    const cmp = comparePaymentLag(lagOf([12, 22, 32]), lagOf([10, 20, 30]));
    const lines = paymentLagComparisonToCsv(cmp).split("\r\n");
    expect(lines[4]).toBe("Veredito;Estável;;;");
  });
});

describe("bookingLeadTimeByContactToCsv", () => {
  const row = (
    over: Partial<BookingLeadTimeByContactCsvRow> = {},
  ): BookingLeadTimeByContactCsvRow => ({
    contact: { name: "Bar do Zé" },
    sample: 4,
    medianDays: 20,
    avgDays: 22,
    shortestDays: 5,
    longestDays: 60,
    reliable: true,
    share: 0.5,
    totalFee: 400_00,
    ...over,
  });

  it("só o cabeçalho quando não há linhas", () => {
    const csv = bookingLeadTimeByContactToCsv([]);
    expect(csv).toBe(BOOKING_LEAD_TIME_BY_CONTACT_CSV_HEADERS.join(";"));
  });

  it("uma linha por contratante com mediana, média, extremos, participação e cachê", () => {
    const csv = bookingLeadTimeByContactToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(BOOKING_LEAD_TIME_BY_CONTACT_CSV_HEADERS.join(";"));
    expect(lines[1]).toBe("Bar do Zé;4;20;22;5;60;50%;400,00");
  });

  it("mediana em branco quando a amostra não é confiável", () => {
    const csv = bookingLeadTimeByContactToCsv([
      row({ sample: 1, reliable: false, medianDays: 200, avgDays: 200, shortestDays: 200, longestDays: 200 }),
    ]);
    const cols = csv.split("\r\n")[1].split(";");
    expect(cols[2]).toBe(""); // mediana suprimida
    expect(cols[3]).toBe("200"); // média sai
  });

  it("grupo sem contratante sai com nome fixo e extremos vazios quando nulos", () => {
    const csv = bookingLeadTimeByContactToCsv([
      row({ contact: null, sample: 0, reliable: false, shortestDays: null, longestDays: null, totalFee: 0, share: 0 }),
    ]);
    const cols = csv.split("\r\n")[1].split(";");
    expect(cols[0]).toBe("Sem contratante");
    expect(cols[4]).toBe(""); // menor
    expect(cols[5]).toBe(""); // maior
  });

  it("preserva a ordem das linhas recebidas", () => {
    const csv = bookingLeadTimeByContactToCsv([
      row({ contact: { name: "Primeiro" } }),
      row({ contact: { name: "Segundo" } }),
    ]);
    const lines = csv.split("\r\n");
    expect(lines[1].startsWith("Primeiro;")).toBe(true);
    expect(lines[2].startsWith("Segundo;")).toBe(true);
  });

  it("sem previousYear, saída idêntica à histórica (8 colunas, sem coluna de comparativo)", () => {
    const csv = bookingLeadTimeByContactToCsv([row({ medianDaysDelta: 12, isNew: false })]);
    const header = csv.split("\r\n")[0];
    expect(header).toBe(BOOKING_LEAD_TIME_BY_CONTACT_CSV_HEADERS.join(";"));
    expect(csv.split("\r\n")[1].split(";")).toHaveLength(8);
  });

  it("com previousYear ganha a coluna 'vs. {ano}' com variação assinada da mediana", () => {
    const csv = bookingLeadTimeByContactToCsv(
      [
        row({ contact: { name: "Ganhou folga" }, medianDaysDelta: 12 }),
        row({ contact: { name: "Perdeu folga" }, medianDaysDelta: -8 }),
        row({ contact: { name: "Novato" }, isNew: true }),
        row({ contact: null, medianDaysDelta: null }), // sem contratante → em branco
      ],
      undefined,
      2025,
    );
    const lines = csv.split("\r\n");
    expect(lines[0].endsWith(";vs. 2025 (dias)")).toBe(true);
    expect(lines[1].split(";").at(-1)).toBe("+12");
    expect(lines[2].split(";").at(-1)).toBe("-8");
    expect(lines[3].split(";").at(-1)).toBe("novo");
    expect(lines[4].split(";").at(-1)).toBe(""); // não comparável
  });
});
