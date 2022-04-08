import { Component, Match, Show, Switch } from "solid-js";
import Button from "./Button";

const PageObstructionScreen: Component<{
    type: "loading" | "error",

    error_text?: string,
    on_retry?: () => void
}> = props => {
    return (
        <div id="page-obstruction-screen" className="ui-domain-page no-anim">
            <div classList={{ "middle-block": true, "no-anim": props.type === "error" }}>
                <Switch>
                    <Match when={ props.type === "loading" }>
                        <div className="logo-text">y</div>
                        <div className="text">Loading...</div>
                    </Match>

                    <Match when={ props.type === "error" }>
                        <div className="logo-text still">!!?</div>
                        <div className="text">{ props.error_text || "Some error occured!" }</div>

                        <Show when={ props.on_retry }>
                            <Button text="Retry" onclick={ props.on_retry } />
                        </Show>
                    </Match>
                </Switch>
            </div>
        </div>
    )
}

export default PageObstructionScreen;
