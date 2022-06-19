import { NavigateOptions, useNavigate } from "solid-app-router";
import { batch, Component, createEffect, createSignal, Match, Switch } from "solid-js";
import { _user_create, _user_login } from "./api/user";

import "./LoginRoute.css";
import { CurrentUser, useCurrentUser } from "./stores/current_user";

interface AuthStepBaseProps {
    /** useNavigate()'s navigate() function */
    navigate: (to: string, options?: Partial<NavigateOptions>) => void,
    
    /** useCurrentUser()'s _set_manual() function */
    set_current_user: ((user: CurrentUser) => void) | undefined,

    /** We'll use this to "navigate" to some other auth step */
    set_step: (step_name: string) => void
}

const LoginStep: Component<AuthStepBaseProps> = props => {
    const [errorMessage, setErrorMessage] = createSignal("");
    const [isAwaiting, setIsAwaiting] = createSignal(false);

    let username_input: HTMLInputElement | undefined;
    let password_input: HTMLInputElement | undefined;

    const onInputKeyDown: InputEventHandler = (e) => {
        if(e.key === "Enter" && e.currentTarget.value) {
            e.currentTarget.blur();
            perform_login();
        }
    }

    const perform_login = (e: MouseEvent | undefined = undefined) => {
        e?.preventDefault();

        const username = username_input?.value;
        const password = password_input?.value;

        if(!username || !password) {
            username_input?.focus();
            return;
        }

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
            
            // TODO @improvement get an error code from the login route and focus on a password field instead if PASSWORD_INCORRECT 
            username_input?.focus();
        });
    }

    return (
        <form className="step">
            <div className="ui-info-panel c-red" hidden={ !errorMessage() }>{ errorMessage() }</div>
            <div className="inputs">
                <div className="input">
                    <input
                        ref={ username_input }
                        name="username"
                        type="text"
                        placeholder="Username"

                        autofocus
                        autocomplete="username"
                        spellcheck={ false }
                        required={ true }

                        onkeydown={ onInputKeyDown }
                    />
                </div>
                <div className="input">
                    <input
                        ref={ password_input }
                        name="password"
                        type="password"
                        placeholder="Password"

                        autocomplete="current-password"
                        required={ true }

                        onkeydown={ onInputKeyDown }
                    />
                </div>
            </div>
            <div className="arrow-spacer">
                <span class="material-icons">expand_more</span>
            </div>
            <div className="buttons">
                <button classList={{ button: true, primary: true, disabled: isAwaiting() }} onclick={ perform_login } type="submit">
                    <div className="text">Log In</div>
                </button>
                <button className="button secondary" onclick={[ props.set_step, "join" ]}>
                    <div className="text">Create an account</div>
                </button>
            </div>
        </form>
    )
}

const JoinStep: Component<AuthStepBaseProps> = props => {
    const [errorMessage, setErrorMessage] = createSignal("");
    const [isAwaiting, setIsAwaiting] = createSignal(false);

    let username_input: HTMLInputElement | undefined;
    let password_input: HTMLInputElement | undefined;
    let password_repeat_input: HTMLInputElement | undefined;

    const onInputKeyDown: InputEventHandler = (e) => {
        if(e.key === "Enter" && e.currentTarget.value) {
            e.currentTarget.blur();
            perform_registration();
        }
    }

    const perform_registration = (e: MouseEvent | undefined = undefined) => {
        e?.preventDefault();

        const username = username_input?.value;
        const password = password_input?.value;
        const password_repeat = password_repeat_input?.value;

        if(!username || !password || !password_repeat) {
            username_input?.focus();
            return;
        }

        // Check if passwords are the same
        if(password !== password_repeat) {
            setErrorMessage("Passwords do not match.");
            password_input?.focus();
            
            return;
        }

        // If for some reason we will not be able to set the currently logged in user - error out
        if(!props.set_current_user) {
            setErrorMessage("Internal error. Try reloading the page.");
            return;
        }

        batch(() => {
            setErrorMessage("");
            setIsAwaiting(true);
        });

        // Perform the registration
        _user_create(props.set_current_user, username, password)
        .then(() => {
            props.navigate("/", { replace: true });
        })
        .catch(message => {
            batch(() => {
                setErrorMessage(message);
                setIsAwaiting(false);
            });
    
            // TODO @improvement get an error code from the login route and focus on a password field instead if PASSWORD_INCORRECT 
            username_input?.focus();
        });
    }

    return (
        <form className="step">
            <div className="ui-info-panel c-red" hidden={ !errorMessage() }>{ errorMessage() }</div>
            <div className="inputs">
                <div className="input">
                    <input
                        ref={ username_input }
                        name="username"
                        type="text"
                        placeholder="Username"

                        autofocus
                        autocomplete="username"
                        spellcheck={ false }
                        required={ true }

                        onkeydown={ onInputKeyDown }
                    />
                </div>
                <div className="input">
                    <input
                        ref={ password_input }
                        name="password"
                        type="password"
                        placeholder="Password"

                        autocomplete="new-password"
                        required={ true }

                        onkeydown={ onInputKeyDown }
                    />
                </div>
                <div className="input">
                    <input
                        ref={ password_repeat_input }
                        name="password_repeat"
                        type="password"
                        placeholder="Repeat password"

                        autocomplete="new-password"
                        required={ true }

                        onkeydown={ onInputKeyDown }
                    />
                </div>
            </div>
            <div className="arrow-spacer">
                <span class="material-icons">expand_more</span>
            </div>
            <div className="buttons">
                <button classList={{ button: true, primary: true, disabled: isAwaiting() }} onclick={ perform_registration } type="submit">
                    <div className="text">Create account</div>
                </button>
                <button className="button secondary" onclick={[ props.set_step, "login" ]}>
                    <div className="text">Log in</div>
                </button>
            </div>
        </form>
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
    action: "login" | "join"
}> = props => {
    const navigate = useNavigate();
    // TODO @incomplete if already logged in - show an error message and a "log out" button
    const [current_user, { _set_manual: set_current_user, logout }] = useCurrentUser();

    const [currentStep, setCurrentStep] = createSignal("login");

    createEffect(() => {
        setCurrentStep(props.action);
    }, [props.action]);

    return (
        <div id="loginroute">
            <div class="middle-container">
                <div class="instance_logo" style={{ "background-image": "url(https://images.unsplash.com/photo-1556139930-c23fa4a4f934?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)" }}></div>
                
                <Switch>
                    <Match when={ current_user.user }>
                        <AlreadyLoggedInStep
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            user_username={ current_user.user!.user_username }
                            logout={ logout }
                        />
                    </Match>

                    <Match when={ currentStep() === "login" }>
                        <LoginStep
                            navigate={ navigate }
                            set_current_user={ set_current_user }

                            set_step={ setCurrentStep }
                        />
                    </Match>

                    <Match when={ currentStep() === "join" }>
                        <JoinStep
                            navigate={ navigate }
                            set_current_user={ set_current_user }

                            set_step={ setCurrentStep }
                        />
                    </Match>
                </Switch>
            </div>
        </div>
    )
}

export default LoginRoute;
