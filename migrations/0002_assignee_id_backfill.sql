UPDATE leads l SET assignee_id = u.id
    FROM crm_users u
    WHERE l.assignee_id IS NULL AND l.assignee IS NOT NULL AND u.name = l.assignee AND u.active = true;

UPDATE projects p SET assignee_id = u.id
    FROM crm_users u
    WHERE p.assignee_id IS NULL AND p.assignee IS NOT NULL AND u.name = p.assignee AND u.active = true;

UPDATE tasks t SET assignee_id = u.id
    FROM crm_users u
    WHERE t.assignee_id IS NULL AND t.assignee IS NOT NULL AND u.name = t.assignee AND u.active = true;

UPDATE support_tickets st SET assignee_id = u.id
    FROM crm_users u
    WHERE st.assignee_id IS NULL AND st.assignee IS NOT NULL AND u.name = st.assignee AND u.active = true;
