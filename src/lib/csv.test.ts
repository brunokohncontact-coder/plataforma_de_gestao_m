import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  toCsv,
  centsToCsvAmount,
  csvDate,
  transactionsToCsv,
  annualSummaryToCsv,
  TRANSACTION_CSV_HEADERS,
  ANNUAL_SUMMARY_CSV_HEADERS,
  type CsvTransaction,
} from "./csv";
import { annualSummary } from "./finance";

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
