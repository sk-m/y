import { Resource } from "solid-js";

export function plural(word: string, n: number): string {
    if(n === 1) return word;
    else return word + "s";
}

export const is_resource_ok = (resource: Resource<unknown>): boolean => {
    let is_ok = true;

    try {
        if ((!resource()) || resource.error || resource.loading) is_ok = false;
    } catch(e) {
        is_ok = false;
    }

    return is_ok;
}
