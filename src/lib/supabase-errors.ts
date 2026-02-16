type PostgrestLikeError = {
  code?: string | null;
  message?: string | null;
  details?: string | null;
  hint?: string | null;
};

function toLowerJoined(error: PostgrestLikeError): string {
  return [
    error.message ?? "",
    error.details ?? "",
    error.hint ?? "",
  ]
    .join(" ")
    .toLowerCase();
}

export function isMissingColumnError(
  error: PostgrestLikeError | null | undefined,
  table: string,
  column: string
): boolean {
  if (!error) return false;

  const message = toLowerJoined(error);
  const tableName = table.toLowerCase();
  const columnName = column.toLowerCase();
  const qualified = `${tableName}.${columnName}`;

  if (error.code === "42703") return true;

  if (error.code === "PGRST204") {
    return message.includes(columnName);
  }

  return (
    message.includes(`column ${qualified} does not exist`) ||
    message.includes(`column "${columnName}" does not exist`) ||
    message.includes(`could not find the '${columnName}' column`) ||
    message.includes(qualified)
  );
}

export function isMissingTableError(
  error: PostgrestLikeError | null | undefined,
  table: string
): boolean {
  if (!error) return false;

  const message = toLowerJoined(error);
  const tableName = table.toLowerCase();

  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    message.includes(`relation "${tableName}" does not exist`) ||
    message.includes(`could not find table '${tableName}'`) ||
    (message.includes(tableName) && message.includes("does not exist"))
  );
}
