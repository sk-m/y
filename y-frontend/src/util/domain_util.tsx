import { Accessor, createSignal, ResourceFetcherInfo } from "solid-js";

export interface CacheableDomainProps<T> {
    cache: Accessor<T | null>,
    setCache: (p: T | null) => void
}

type AsyncResourceFetcher<S, T> = (k: S, info: ResourceFetcherInfo<T>) => Promise<T>;

// TODO @cleanup
/**
 * Wrapper for a fetcher, used in solid's `createResource()`
 * 
 * Use this function if you want to cache the results of the fetcher. `cache_accessor` and `cache_setter` should be recieved
 * from `createSignal()` that was run in the parent domain component.
 * 
 * For example, if we are using this function inside the `PreferencesPage` component (user domain), these two parameters should be retrieved
 * from the `UserDomain` component via props.
 * 
 * * If cache does not exist yet, we will run the fetcher and save the object it resolves into the cache signal that should "live" in the
 * parent component.
 * * If cache does exists, we'll use it without even running the fetcher.
 * 
 * @param cache_accessor Cachce accessor (first element returned by `createSignal()`)
 * @param cache_setter Cache setter (second element returned by `createSignal()`)
 * @param fetcher Your fetcher function (what you would have provided for `createResource()`)
 */
export const cachedFetcher = <S, T>(cache_accessor: Accessor<T>, cache_setter: (p: T) => void, fetcher: AsyncResourceFetcher<S, T>): AsyncResourceFetcher<S, T> => {
    return (source: S, info: ResourceFetcherInfo<T>) => {
        return new Promise((resolve, reject) => {
            const cache = cache_accessor();
        
            if(!info.refetching && cache) {
                console.debug("[y] [💾 domain cache] 🔼 Using data from the cache");
                
                resolve(cache);
            } else {
                console.debug("[y] [💾 domain cache] 🔃 Cache is empty, running the fetcher...");
                
                fetcher(source, info)
                .then(d => {
                    console.debug("[y] [💾 domain cache] 🔽 Saving data into cache...");

                    cache_setter(d);
                    resolve(d);
                })
                .catch(reject);
            }
        })
    }
}

/**
 * Returns _ui_state signal (accessor) and it's setter _ui_setState
 * 
 * @param defaultState default _ui_state value
 * @param setCache cache signal's setter (if you want to automatically clear cache each time you update _ui_state)
 */
export const appendUIStateFields = <T,>(defaultState: T, setCache?: (c: null) => void):
    { _ui_state: Accessor<T>, _ui_setState: (v: T) => void } => {
    const [_ui_state, ui_setState] = createSignal(defaultState);

    return {
        _ui_state,
        _ui_setState: setCache
            ? (p: T) => {
                ui_setState(() => p);
                setCache(null);
            }
            : ui_setState as (v: T) => void
    };
}
