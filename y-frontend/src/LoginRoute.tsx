import { Component } from "solid-js";

import "./LoginRoute.css";

const LoginRoute: Component = () => {
    return (
        <div id="loginroute">
            <div class="middle-container">
                <div class="instance_logo" style={{ "background-image": "url(https://images.unsplash.com/photo-1556139930-c23fa4a4f934?ixlib=rb-1.2.1&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1470&q=80)" }}></div>
                
                <div className="step">
                    <div className="inputs">
                        <div className="input">
                            <input type="text" placeholder="Username" autofocus />
                        </div>
                        <div className="input">
                            <input type="password" placeholder="Password" />
                        </div>
                    </div>
                    <div className="arrow-spacer">
                        <span class="material-icons">expand_more</span>
                    </div>
                    <div className="buttons">
                        <button className="button primary">
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
