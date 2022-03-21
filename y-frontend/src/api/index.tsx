// TODO @placeholder
const API_URL = "http://beta.local:8083";

export default {
    login: async (username: string, password: string) => {

        return window.fetch(API_URL + "/user/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },

            body: new URLSearchParams({
                username,
                password
            })
        });
    }
}
