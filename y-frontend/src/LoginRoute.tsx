import { NavigateOptions, useNavigate } from "solid-app-router";
import { batch, Component, createSignal, Match, Switch } from "solid-js";
import API from "./api";

import "./LoginRoute.css";
import { CurrentUser, useCurrentUser } from "./stores/current_user";

const LoginStep: Component<{
    navigate: (to: string, options?: Partial<NavigateOptions>) => void,
    set_current_user: ((user: CurrentUser) => void) | undefined
}> = props => {
    const [errorMessage, setErrorMessage] = createSignal("");
    const [isAwaiting, setIsAwaiting] = createSignal(false);

    let username_input: HTMLInputElement | undefined;
    let password_input: HTMLInputElement | undefined;

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
                    props.navigate("/", { replace: true });

                    // The /auth/login route will return some basic info about the user upon successfull log in
                    // We could have just called `_refresh_ensure()` from the CurrentUserProvider, but that would have been wasteful
                    if(props.set_current_user) props.set_current_user({
                        user_id: json.user_id,
                        user_username: json.user_username,
                    });
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
    )
}

const AlreadyLoggedInStep: Component<{
    user_username: string
}> = props => {
    return (
        <div className="step">
            <div className="ui-text a-center s-small-1">
                Looks like you are already logged in as <span className="ui-text w-500 c-blue">{ props.user_username }.</span>
            </div>
            <div className="ui-text a-center s-small-1">
                Do you want to log in as someone else?
            </div>

            <div className="arrow-spacer">
                <span class="material-icons">expand_more</span>
            </div>

            <div className="buttons">
                <button className="button secondary">
                    <div className="text">Log out</div>
                </button>
            </div>
        </div>
    )
}

const LoginRoute: Component<{
    action: "login" | "register"
}> = props => {
    const navigate = useNavigate();
    // TODO @incomplete if already logged in - show an error message and a "log out" button
    const [current_user, { _set_manual: set_current_user }] = useCurrentUser();

    return (
        <div id="loginroute">
            <div class="middle-container">
                <div class="instance_logo" style={{ "background-image": "url(https://images.unsplash.com/photo-1556139930-c23fa4a4f934?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)" }}></div>
                
                <Switch>
                    <Match when={ current_user.user }>
                        <AlreadyLoggedInStep
                            user_username={ current_user.user!.user_username }
                        />
                    </Match>

                    <Match when={ props.action === "login" }>
                        <LoginStep
                            navigate={ navigate }
                            set_current_user={ set_current_user }
                        />
                    </Match>
                </Switch>
            </div>
        </div>
    )
}

export default LoginRoute;
