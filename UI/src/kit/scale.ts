// Names of a token scale (i4-kit.md, Step I4.2). Layout props take one of
// these names, never a value (R10): a value outside the scale is a compile error.
export type Scale = 'xs' | 'sm' | 'md' | 'lg' | 'xl'
