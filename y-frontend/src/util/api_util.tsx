import CONFIG from "../../config/config.json";

const API_URL = CONFIG.api_url;

export interface APIError {
    error_message: string;
}

export type APIResponse<TData = void, RouteName extends string | void = void> = {
    meta: {
        success?: boolean;
        
        error?: boolean;
        error_message?: string;

        client_unauthenticated?: boolean;
    };
} & (RouteName extends string ? {[R in RouteName]: TData} : {});

export function api_fetch<TResponse = APIResponse<void>>(route: string, options: RequestInit | undefined): Promise<TResponse> {
    return new Promise<TResponse>((resolve, reject) => {
        window.fetch(API_URL + route, options)
        .then(res => (
            res.json()
            .then(json => {
                if(!json.meta) {
                    return reject(new Error("Internal error. Try again in a second."))
                }
                
                if(json.meta.error) {
                    if(json.meta.client_unauthenticated) {
                        sessionStorage.removeItem("y_current_user");
                    }

                    return reject(new Error(json.meta.error_message))
                }
    
                return resolve(json);
            })
        ))
        .catch(() => {
            return reject(new Error("Internal error. Try again in a second."))
        });
    })
}
