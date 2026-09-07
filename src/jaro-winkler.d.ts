declare module 'jaro-winkler' {
  function distance(
    s1: string,
    s2: string,
    options?: {caseSensitive?: boolean}
  ): number
  export = distance
}
