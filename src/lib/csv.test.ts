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
  quarterlySummaryToCsv,
  showProfitToCsv,
  venueProfitToCsv,
  contactProfitToCsv,
  contactActivityToCsv,
  receivablesToCsv,
  receivablesByContactToCsv,
  paymentLagByContactToCsv,
  TRANSACTION_CSV_HEADERS,
  SHOW_CSV_HEADERS,
  ANNUAL_SUMMARY_CSV_HEADERS,
  QUARTERLY_SUMMARY_CSV_HEADERS,
  SHOW_PROFIT_CSV_HEADERS,
  CONTACT_PROFIT_CSV_HEADERS,
  CONTACT_ACTIVITY_CSV_HEADERS,
  RECEIVABLE_CSV_HEADERS,
  RECEIVABLE_BY_CONTACT_CSV_HEADERS,
  PAYMENT_LAG_BY_CONTACT_CSV_HEADERS,
  type CsvTransaction,
  type CsvShow,
  type CsvProfitShow,
  type ContactActivityCsvRow,
  type ReceivableCsvRow,
  type ReceivableByContactCsvRow,
  type PaymentLagByContactCsvRow,
} from "./csv";
import {
  annualSummary,
  quarterlySummary,
  type ShowProfitRow,
  type VenueProfitRow,
  type ContactProfitRow,
} from "./finance";

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
});

describe("venueProfitToCsv", () => {
  const row = (over: Partial<VenueProfitRow> = {}): VenueProfitRow => ({
    key: "bar-x",
    name: "Bar X",
    showCount: 4,
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
      "Local;Shows;Cachê (R$);Cachê mediano (R$);Extras (R$);Despesas (R$);Resultado (R$);Média/show (R$)",
    );
    expect(venueProfitToCsv([], "Cidade").split("\r\n")[0].startsWith("Cidade;")).toBe(true);
  });

  it("serializa uma linha com o cachê mediano (amostra suficiente)", () => {
    const csv = venueProfitToCsv([row()], "Local");
    expect(csv.split("\r\n")[1]).toBe(
      "Bar X;4;6000,00;1500,00;500,00;800,00;5700,00;1425,00",
    );
  });

  it("deixa o cachê mediano vazio abaixo da amostra mínima", () => {
    const csv = venueProfitToCsv([row({ showCount: 2 })], "Local");
    // 4ª coluna (índice 3) = cachê mediano, vazia com poucos shows.
    expect(csv.split("\r\n")[1].split(";")[3]).toBe("");
  });

  it("escapa nomes com delimitador", () => {
    const csv = venueProfitToCsv([row({ name: "Bar; Pub" })], "Local");
    expect(csv.split("\r\n")[1]).toContain('"Bar; Pub"');
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
    ...over,
  });

  it("emite só o cabeçalho quando não há linhas", () => {
    expect(contactProfitToCsv([])).toBe(CONTACT_PROFIT_CSV_HEADERS.join(";"));
  });

  it("serializa contratante com papel legível e valores com vírgula", () => {
    const csv = contactProfitToCsv([row()]);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "Contratante;Papel;Shows;Cachê (R$);Extras (R$);Despesas (R$);Cachê médio (R$);Cachê mediano (R$);Resultado (R$);Média/show (R$)",
    );
    expect(lines[1]).toBe(
      "Produtora Lua;Produtor/Promoter;5;7500,00;0,00;1000,00;1500,00;1500,00;6500,00;1300,00",
    );
  });

  it("usa 'Sem contratante' e papel em branco para o grupo sem contato", () => {
    const csv = contactProfitToCsv([row({ contact: null })]);
    const cols = csv.split("\r\n")[1].split(";");
    expect(cols[0]).toBe("Sem contratante");
    expect(cols[1]).toBe("");
  });

  it("deixa o cachê mediano vazio abaixo da amostra mínima", () => {
    const csv = contactProfitToCsv([row({ showCount: 2 })]);
    // 8ª coluna (índice 7) = cachê mediano.
    expect(csv.split("\r\n")[1].split(";")[7]).toBe("");
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
      "Contratante;Papel;A receber (R$);Shows;Pior atraso (dias);Atraso médio (dias);Participação;Promessas vencidas;A receber vencido (R$)",
    );
    expect(lines[1]).toBe("Bar do Zé;Casa de show;1500,00;3;62;40;60%;0;0,00");
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
});
