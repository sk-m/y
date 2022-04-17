export function plural(word: string, n: number): string {
    if(n === 1) return word;
    else return word + "s";
}