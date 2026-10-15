export type SafetyChoice = "escape" | "raw" | undefined;
// Including control/whitespace prefixes avoids hiding a formula behind whitespace.
export function riskyText(text: string): boolean {
  /* eslint-disable no-control-regex -- untrusted CSV control prefixes must be detected */
  return (
    /^[\s\u0000-\u001f\u007f]*[=+\-@]/u.test(text) || /^[\t\r\n]/u.test(text)
  );
}
export const exportText = (text: string, choice: SafetyChoice) =>
  choice === "escape" && riskyText(text) ? `'${text}` : text;
