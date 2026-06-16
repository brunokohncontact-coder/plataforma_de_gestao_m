import { describe, it, expect } from "vitest";
import {
  escapeCsvField,
  toCsv,
  centsToCsvAmount,
  csvDate,
  transactionsToCsv,
  TRANSACTION_CSV_HEADERS,
  type CsvTransaction,
} from "./csv";

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
