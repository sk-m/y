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
} & (RouteName extends string ? {[R in RouteName]: TData} : Record<string, never>);

export function api_fetch<TData = void, RouteName extends string | void = void>(route: string, options: RequestInit | undefined): Promise<APIResponse<TData, RouteName>> {
    return new Promise<APIResponse<TData, RouteName>>((resolve, reject) => {
        window.fetch(API_URL + route, options)
        .then(res => (
            res.json()
            .then((json: unknown) => {
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
                if(!json || !((json as APIResponse).meta)) {
                    return reject(new Error("Internal error. Try again in a second."))
                }
                
                const response_json = json as APIResponse<TData, RouteName>;

                if(response_json.meta.error) {
                    if(response_json.meta.client_unauthenticated) {
                        sessionStorage.removeItem("y_current_user");
                    }

                    return reject(new Error(response_json.meta.error_message))
                }
    
                return resolve(response_json);
            })
        ))
        .catch(() => {
            return reject(new Error("Internal error. Try again in a second."))
        });
    })
}
