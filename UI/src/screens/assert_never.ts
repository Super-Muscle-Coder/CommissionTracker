// The screens zone's own copy of assertNever (iwca_theory.md §6, R8, D4): the
// screens zone may import only types from the logic zone. Last branch of every
// branching on the kind of a ViewResult; a kind left unhandled is a compile error.
export function assertNever(x: never): never {
  throw new Error(`Unhandled result kind: ${JSON.stringify(x)}`)
}
