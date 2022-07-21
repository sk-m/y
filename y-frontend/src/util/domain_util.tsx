import { Accessor, createSignal, ResourceFetcherInfo, createResource } from "solid-js";
import { Resource, ResourceOptions, ResourceSource, Setter } from "solid-js/types/reactive/signal";

export interface CacheableDomainProps<T> {
    cache: Accessor<DomainCache<T>>,
    setCache: (c: DomainCache<T>) => void
}

/**
 * [0] = source
 * [1] = data
 */
export type DomainCache<T> = [string | number | undefined | null, T | undefined];

export type DomainCacheMutator<T> = (data: T, clear_cache?: boolean) => T;

type AsyncResourceFetcher<S, T> = (k: S, info: ResourceFetcherInfo<T>) => Promise<T>;

/**
 * Identical to solid's `createResource()` but with a few additions
 * 
 * ! Important to understand, please read through the comment
 * 
 * * If cache is empty, the provided fetcher function will be run. Data, that this fetcher resolves, will be automatically
 * saved into the cache
 * * If cache is NOT empty, the provided fetcher function will not even be run. Data from the cache will be used instead 
 * 
 * Returns two functions:
 * * refetch - Forcefully run the fetcher again. New data will also be saved into cache, as usual
 * * mutate - Directly update the data in the resource. By default, new data will also be saved into the cache. If clear_cache == true -
 * the cache will be cleared instead
 *
 * As a rule of thumb,
 * * Use refetch if you have updated a resource, and it's new, complete, updated state is *not* known.
 * * Use mutate if you have updated a resource, and it's new state is completely known, without making any more requests to the server,
 * as the server will return exactly what you already know.
 *
 * For example, if you have updated an object, and the updates that you made have introduced side-effects onto that object, and the server
 * did *not* return a complete representation of the freshly updated object, you should run refetch or clear the cache.
 * This will ensure that your frontend state is the same as the server state.
 * 
 * On the other hand, if you have updated an object (with or without introducing side-effects), and the server has returned a *complete*,
 * updated object, you should mutate the state directly, as any subsequent fetches (either now, if you call refetch, or in the future, if
 * you just clear the cache), will return the same data you already posses.
 * 
 * ! After I make changes to the server state (by making a POST, PUT, PATCH... request), should I clear the cache, refetch, mutate, or noop?
 * That heavily depends on the situation. Here are the effects of each:
 * 
 * * nooping will keep the current resource and cache completely untouched. New data will only get fetched once the `source` parameter
 * gets changed (or refetch is called / source changes). Re-mounting the component will *not* trigger a refetch, as both the source
 * and the cache are still the same.
 * * clearing the cache will keep the current resource data untouched, but, obviously, will clear the cache. New data will get fetched
 * on the next mount of a component (or refetch call / source change) as the cache is now empty -> a fetcher must
 * be run (no matter the source).
 * 
 * * refetching will force both the resource and the cache to be updated by running a fetcher. The next refetch will only happen upon an
 * another refetch call or source change. Remounting the component will not trigger a refetch because the source has not changed and
 * the cache is set.
 * * mutating with clear_cache == false (default) will not trigger a refetch, but will instead directly update both the resource and the
 * cache. Remounting the component will *not* trigger a refetch, because the source has not changed and the cache is still set.
 * 
 * When in doubt:
 * * UI needs to be updated instantly after a successful POST, PUT... request -> refetch
 * * UI can keep it's current state until the next mount of the component -> clear the cache
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
        mutate: DomainCacheMutator<T>;
        refetch: (info?: unknown) => void;
    }
] => {
    const wrapped_fetcher = (source: S, info: ResourceFetcherInfo<T>): T | Promise<T> => {
        return new Promise((resolve, reject) => {
            const cache = cache_accessor();
        
            if(!info.refetching && cache[1] && cache[0] === source) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                console.debug(`[y] [💾 cached resource] 🔼 Using data from the cache. Source: ${ source }`);
                
                resolve(cache[1]);
            } else {
                if(info.refetching) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    console.debug(`[y] [💾 cached resource] 🔃 Force refetching for ${ source } ...`);
                } if(cache[1]) {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    console.debug(`[y] [💾 cached resource] 🔃 Cache exists, but the source differs (${ source } != ${ cache[0] }); running the fetcher...`);
                } else {
                // eslint-disable-next-line @typescript-eslint/restrict-template-expressions
                    console.debug(`[y] [💾 cached resource] 🔃 Cache is empty, running the fetcher for ${ source } ...`);
                }
                
                fetcher(source, info)
                .then(d => {
                    console.debug("[y] [💾 cached resource] 🔽 Saving data into cache...");

                    cache_setter([source, d]);
                    resolve(d);
                })
                .catch(e => {
                    cache_setter([null, undefined]);
                    reject(e);
                });
            }
        });
    };

    const [resource, { mutate: _mutate, refetch }] = createResource(source, wrapped_fetcher, options);

    const mutate = (data: T, clear_cache = false) => {
        console.debug(`[y] [💾 cached resource] 🖌 Directly mutating local resource data. ${
            clear_cache
            ? "Clearing the cache (subsequent loads of the page will trigger an API request, but local data is changed)"
            : "Setting cache to the new data (subsequent (re)renders will *not* trigger a refetch and will instead use the new \
data, as it is now also saved to the cache)"
        }...`);

        if(clear_cache) cache_setter([null, undefined]);
        else {
            const current_cache = cache_accessor();

            // We have directly mutated the data, so let's just update the data part of the cache - the source has not changed
            cache_setter([current_cache[0], data])
        }

        return _mutate(() => data);
    }

    return [resource, { mutate, refetch }];
}

/**
 * Returns $ui_state signal (accessor) and it's setter $ui_setState
 * 
 * @param defaultState default $ui_state value
 */
export const appendUIStateFields = <StateT,>(defaultState: StateT):
    { $ui_state: Accessor<StateT>, $ui_setState: Setter<StateT>} => {
    const [$ui_state, $ui_setState] = createSignal(defaultState);

    return {
        $ui_state,
        $ui_setState
    };
}
