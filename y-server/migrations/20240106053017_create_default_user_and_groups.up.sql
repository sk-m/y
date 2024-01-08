DO $$
  DECLARE admin_group_id integer;
  DECLARE admin_user_id integer;
BEGIN
    -- Password is 'admin'
    INSERT INTO users (username, password) VALUES ('admin', '$pbkdf2-sha256$i=600000,l=32$Lt/elXAzTITlKrCFLUvBcQ$w67zGVHY24ZeGQtB+9Pu8bp0EaQvncwk8yB8BinkNlU') RETURNING id INTO admin_user_id;
    INSERT INTO user_groups (name) VALUES ('admin') RETURNING id INTO admin_group_id;

    INSERT INTO user_group_rights (group_id, right_name, right_options) VALUES (admin_group_id, 'manage_user_groups', '{"allow_creating_user_groups": true, "allow_deleting_user_groups": true}'), (admin_group_id, 'assign_user_groups', '{"allow_assigning_any_group": true}');

    INSERT INTO user_group_membership (user_id, group_id) VALUES (admin_user_id, admin_group_id);
END $$;
