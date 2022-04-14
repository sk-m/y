import { Accessor, createSignal, ResourceFetcherInfo, createResource } from "solid-js";
import { Resource, ResourceOptions, ResourceSource } from "solid-js/types/reactive/signal";

export interface CacheableDomainProps<T> {
    cache: Accessor<DomainCache<T>>,
    setCache: (c: DomainCache<T>) => void
}

export type DomainCache<T> = [string | number | undefined | null, T | undefined];

type AsyncResourceFetcher<S, T> = (k: S, info: ResourceFetcherInfo<T>) => Promise<T>;

/**
 * Identical to solid's `createResource()` but with a few additions
 * 
 * * If cache is empty, the provided fetcher function will be run. Data, that this fetcher resolves, will be automatically
 * saved into the cache
 * * If cache is NOT empty, the provided fetcher function will not even be run. Data from the cache will be used instead 
 * * `mutate` function will automatically clear the cache
 * 
 * @param source solid's `createResource()` `source` argument
 * @param fetcher solid's `createResource()` `fetcher` argument
 * @param cache_accessor cache signal accessor
 * @param cache_setter cache signal setter
 * @param options solid's `createResource()` `options` argument
 */
export const createCachedResource = <T,S extends string | number | undefined | null>(
    source: ResourceSource<S>,
    fetcher: AsyncResourceFetcher<S, T>,
    cache_accessor: Accessor<DomainCache<T>>,
    cache_setter: (c: DomainCache<T>) => void,
    options?: ResourceOptions<undefined>
): [
    // TODO @refactor align mutate with Setter<T>
    Resource<T | undefined>,
    { 
        mutate: (setter: (prev: T | undefined) => T) => T;
        refetch: (info?: unknown) => void;
    }
] => {
    const wrapped_fetcher = (source: S, info: ResourceFetcherInfo<T>): T | Promise<T> => {
        return new Promise((resolve, reject) => {
            const cache = cache_accessor();
        
            if(!info.refetching && cache[1] && cache[0] === source) {
                console.debug(`[y] [💾 domain cache] 🔼 Using data from the cache. Source: ${ source }`);
                
                resolve(cache[1]);
            } else {
                if(info.refetching) {
                    console.debug(`[y] [💾 domain cache] 🔃 Force refetching for ${ source } ...`);
                } if(cache[1]) {
                    console.debug(`[y] [💾 domain cache] 🔃 Cache exists, but the source differs (${ source } != ${ cache[0] }); running the fetcher...`);
                } else {
                    console.debug(`[y] [💾 domain cache] 🔃 Cache is empty, running the fetcher for ${ source } ...`);
                }
                
                fetcher(source, info)
                .then(d => {
                    console.debug("[y] [💾 domain cache] 🔽 Saving data into cache...");

                    cache_setter([source, d]);
                    resolve(d);
                })
                .catch(reject);
            }
        });
    };

    const [resource, { mutate: _mutate, refetch: refetch }] = createResource(source, wrapped_fetcher, options);

    const mutate = (setter: (prev: T | undefined) => T) => {
        cache_setter([null, undefined]);
        return _mutate(setter);
    }

    return [resource, { mutate, refetch }];
}

/**
 * Returns _ui_state signal (accessor) and it's setter _ui_setState
 * 
 * @param defaultState default _ui_state value
 * @param setCache cache signal's setter (if you want to automatically clear cache each time you update _ui_state)
 */
export const appendUIStateFields = <T,>(defaultState: T, setCache?: (c: DomainCache<any>) => void):
    { _ui_state: Accessor<T>, _ui_setState: (v: T) => void } => {
    const [_ui_state, ui_setState] = createSignal(defaultState);

    return {
        _ui_state,
        _ui_setState: setCache
            ? (p: T) => {
                ui_setState(() => p);
                setCache([null, undefined]);
            }
            : ui_setState as (v: T) => void
    };
}
