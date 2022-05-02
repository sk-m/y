import CONFIG from "../../config/config.json";

const API_URL = CONFIG.api_url;

export type APIResponse<TData = never, RouteName extends string | never = never> = {
    meta: {
        success?: boolean;
        
        error?: boolean;
        error_message?: string;

        client_unauthenticated?: boolean;
    };
} & (RouteName extends string ? {[R in RouteName]: TData} : {});

export function api_fetch<TData = APIResponse>(route: string, options: RequestInit | undefined): Promise<TData> {
    return new Promise((resolve, reject) => {
        window.fetch(API_URL + route, options)
        .then(res => {
            res.json()
            .then(json => {
                if(!json.meta) {
                    return reject(new Error("Internal error. Try again in a second."))
                }
                
                if(json.meta.error) {
                    return reject(new Error(json.meta.error_message))
                }
    
                return resolve(json);
            })
        })
        .catch(() => {
            return reject(new Error("Internal error. Try again in a second."))
        });
    })
}
