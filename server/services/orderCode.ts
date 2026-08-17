export function createOrderCode(date: Date, sequence: number): string {
  const datePart = [
    date.getUTCFullYear(),
    String(date.getUTCMonth() + 1).padStart(2, "0"),
    String(date.getUTCDate()).padStart(2, "0"),
  ].join("");

  return `TB-${datePart}-${String(sequence).padStart(4, "0")}`;
}
