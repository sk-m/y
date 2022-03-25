import { useNavigate } from "solid-app-router";
import { batch, Component, createSignal } from "solid-js";
import API from "./api";

import "./LoginRoute.css";
import { useCurrentUser } from "./stores/current_user";

const LoginRoute: Component = () => {
    const navigate = useNavigate();
    // TODO @incomplete if already logged in - show an error message and a "log out" button
    const [current_user, { refresh_ensure: refresh_current_user }] = useCurrentUser();

    let username_input: HTMLInputElement | undefined;
    let password_input: HTMLInputElement | undefined;

    const [errorMessage, setErrorMessage] = createSignal("");
    const [isAwaiting, setIsAwaiting] = createSignal(false);

    const set_error = (message: string) => {
        batch(() => {
            setErrorMessage(message);
            setIsAwaiting(false);
        });

        username_input?.focus();
    }

    const onInputKeyDown = (e: KeyboardEvent) => {
        if(e.key === "Enter") {
            password_input?.blur();
            perform_login();
        }
    }

    const perform_login = () => {
        const username = username_input?.value;
        const password = password_input?.value;

        if(!username || !password) return;

        batch(() => {
            setErrorMessage("");
            setIsAwaiting(true);
        });

        API.login(username, password)
        .then(resp => {
            resp.json()
            .then(json => {
                if(json.error) {
                    set_error(json.error_message || "Unknown error occured!");
                } else {
                    // Login successful
                    navigate("/", { replace: true });

                    // TODO @performance @improvement We can just return the user_id and user_username from the /user/login API call
                    if(refresh_current_user) refresh_current_user();
                }
            })
            .catch(() => {
                set_error("Internal error occured! Please, try again later.");
            });
        })
        .catch(() => {
            set_error("Internal error occured! Please, try again later.");
        });
    }

    return (
        <div id="loginroute">
            <div class="middle-container">
                <div class="instance_logo" style={{ "background-image": "url(https://images.unsplash.com/photo-1556139930-c23fa4a4f934?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)" }}></div>
                
                <div className="step">
                    <div className="ui-info-panel c-red" hidden={ !errorMessage() }>{ errorMessage() }</div>
                    <div className="inputs">
                        <div className="input">
                            <input ref={ username_input } type="text" placeholder="Username" onkeydown={ onInputKeyDown } autofocus />
                        </div>
                        <div className="input">
                            <input ref={ password_input } type="password" placeholder="Password" onkeydown={ onInputKeyDown } />
                        </div>
                    </div>
                    <div className="arrow-spacer">
                        <span class="material-icons">expand_more</span>
                    </div>
                    <div className="buttons">
                        <button classList={{ button: true, primary: true, disabled: isAwaiting() }} onclick={ perform_login }>
                            <div className="text">Log In</div>
                        </button>
                        <button className="button secondary">
                            <div className="text">Create an account</div>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default LoginRoute;
