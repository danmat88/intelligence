/**
 * Older contextual-help flows opened the global solver with an internal
 * teacher instruction. Preserve the stored turn for history and AI context,
 * but never present that scaffolding as the learner's problem.
 */
export function normalizeDisplayedProblemText(text: string): string {
  if (!/(?:Lucrez|Exersez).*(?:Ajută-mă|Enunț:)/is.test(text)) return text
  const match = text.match(
    /Enunț:\s*([\s\S]*?)(?=\s*(?:Competență:|Răspunsul meu:|Ce am scris eu:|Ajută-mă(?: pedagogic)?|$))/i,
  )
  return match?.[1]?.trim() || text
}
