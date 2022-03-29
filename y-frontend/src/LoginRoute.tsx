import { NavigateOptions, useNavigate } from "solid-app-router";
import { batch, Component, createSignal, Match, Switch } from "solid-js";
import API from "./api";
import { _user_login } from "./api/user";

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

        // If for some reason we will not be able to set the currently logged in user - error out
        if(!props.set_current_user) {
            setErrorMessage("Internal error. Try reloading the page.");
            return;
        }

        batch(() => {
            setErrorMessage("");
            setIsAwaiting(true);
        });

        // Perform the login
        _user_login(props.set_current_user, username, password)
        .then(() => {
            props.navigate("/", { replace: true });
        })
        .catch(message => {
            batch(() => {
                setErrorMessage(message);
                setIsAwaiting(false);
            });
    
            username_input?.focus();
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
    user_username: string,
    logout: (() => void) | undefined
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
                <button className="button secondary" onclick={ props.logout }>
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
    const [current_user, { _set_manual: set_current_user, logout }] = useCurrentUser();

    return (
        <div id="loginroute">
            <div class="middle-container">
                <div class="instance_logo" style={{ "background-image": "url(https://images.unsplash.com/photo-1556139930-c23fa4a4f934?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)" }}></div>
                
                <Switch>
                    <Match when={ current_user.user }>
                        <AlreadyLoggedInStep
                            user_username={ current_user.user!.user_username }
                            logout={ logout }
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
