import { useNavigate } from "solid-app-router";
import { Component } from "solid-js";
import Button from "../components/Button";
import Input from "../components/Input";
import { useForm } from "../util/form";

import "./CreateUserGroupPage.css";

const CreateUserGroupPage: Component = () => {
    const navigate = useNavigate();

    const { link, register_form, submit } = useForm({
        group_name: {
            min_length: 1,
            max_length: 128
        },
        group_display_name: {
            min_length: 1,
            max_length: 128
        },
        summary: {
            min_length: 1,
            max_length: 4096,
        },
    }, {
        onSubmit: () => {
            return;
        },
    });

    return (
        <div className="ui-domain-page no-anim" id="create-usergroup-page">
            <div className="ui-domain-page-header" style={{ "max-width": "800px" }}>
                <span className="title ui-text-w-icon-l gray-icon">
                    <span class="material-icons-round">group_add</span>
                    New User Group
                </span>
                <div className="description">Use this wizard to create a new user group.</div>
            </div>

            <div className="ui-spacer"></div>

            <form {...register_form()}>
                <Input
                    label="Internal group name"

                    {...link("group_name")}
                />

                <Input
                    label="Display group name"

                    {...link("group_display_name")}
                />

                <div className="ui-spacer"></div>

                <Input
                    label="Summary // reasoning"
                    placeholder="My boss asked me to..."

                    {...link("summary", { submittable_field: true })}
                />

                <div className="ui-spacer">
                    <span class="material-icons-round">expand_more</span>
                </div>

                <div className="ui-between center">
                    <Button 
                        text="To groups list"
                        type="filled"

                        onclick={[navigate, "/user-groups"]}
                    />

                    <Button 
                        text="Create new group"
                        hint="submit"

                        onclick={ submit }
                    />
                </div>
            </form>
        </div>
    )
}

export default CreateUserGroupPage;
