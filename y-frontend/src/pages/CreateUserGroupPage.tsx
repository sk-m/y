import { useNavigate } from "solid-app-router";
import { Component } from "solid-js";
import Button from "../components/Button";
import Input from "../components/Input";
import { useForm } from "../util/form";
import API from "../api";

import "./CreateUserGroupPage.css";
import ErrorInfoPanel from "../components/ErrorInfoPanel";
import { APIResponse } from "../util/api_util";
import { UserGroup } from "../interfaces/usergroup";

const CreateUserGroupPage: Component = () => {
    const navigate = useNavigate();

    const { link, register_form, submit, global_error, status } = useForm({
        group_name: {
            min_length: 1,
            max_length: 64
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
        onSubmit: (values) => {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return API.usergroup_create(values.group_name!, values.group_display_name!);
        },

        onSuccess: (data: APIResponse<UserGroup, "usergroup_create">) => {
            navigate(`/user-groups/${ data.usergroup_create.group_name }`);
        }
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
                <div className="mb-1">
                    <ErrorInfoPanel
                        message={ global_error()?.error_message }
                    />
                </div>

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

                        disabled={ status() === "fetching" }

                        onclick={ submit }
                    />
                </div>
            </form>
        </div>
    )
}

export default CreateUserGroupPage;
