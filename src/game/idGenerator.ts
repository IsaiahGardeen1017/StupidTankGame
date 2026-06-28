let iditer = 1;

export function newId(): string {
    return `${iditer++}`;
}
