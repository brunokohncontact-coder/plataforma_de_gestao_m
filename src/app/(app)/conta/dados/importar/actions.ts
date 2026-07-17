"use server";

import { requireUser } from "@/lib/session";
import {
  parseAccountDataExportJson,
  type AccountImportSummary,
} from "@/lib/accountImport";

// Conferência (dry-run) do backup: NÃO grava nada — só lê o arquivo enviado e
// devolve o que ele contém + eventuais problemas. A restauração de fato (escrita
// no banco) é um passo separado, ainda não implementado. Ver DECISIONS.md.

/** Teto de tamanho do arquivo aceito na conferência (evita ler uploads enormes). */
export const MAX_IMPORT_BYTES = 8 * 1024 * 1024; // 8 MB

export interface ImportPreviewState {
  errors?: string[];
  summary?: AccountImportSummary;
  warnings?: string[];
}

export async function previewAccountImportAction(
  _prev: ImportPreviewState,
  formData: FormData,
): Promise<ImportPreviewState> {
  // Gate de sessão: conferir um backup exige estar logado (mesma proteção do export).
  await requireUser();

  const file = formData.get("arquivo");
  if (!(file instanceof File) || file.size === 0) {
    return { errors: ["Selecione um arquivo .json de backup para conferir."] };
  }
  if (file.size > MAX_IMPORT_BYTES) {
    return { errors: ["Arquivo muito grande (máximo 8 MB)."] };
  }

  const text = await file.text();
  const result = parseAccountDataExportJson(text);
  if (!result.ok) {
    return { errors: result.errors };
  }
  return { summary: result.summary, warnings: result.warnings };
}
