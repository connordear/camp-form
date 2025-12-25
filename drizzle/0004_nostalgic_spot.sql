-- Custom SQL migration file, put your code below! --
CREATE OR REPLACE FUNCTION check_camper_deletion_rule()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if there are any registrations that are NOT 'draft'
    IF EXISTS (
        SELECT 1 
        FROM registrations 
        WHERE camper_id = OLD.id 
        AND status != 'draft'
    ) THEN
        -- If found, stop everything and throw an error
        RAISE EXCEPTION 'Constraint Violation: Cannot delete camper % because they have active registrations.', OLD.id;
    END IF;

    -- If only 'drafts' exist (or no registrations), allow the delete
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger to the table
CREATE TRIGGER prevent_active_camper_deletion
BEFORE DELETE ON campers
FOR EACH ROW
EXECUTE FUNCTION check_camper_deletion_rule();

CREATE OR REPLACE FUNCTION check_registration_self_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Check if the row being deleted is NOT 'draft'
    IF OLD.status != 'draft' THEN
        RAISE EXCEPTION 'Constraint Violation: Cannot delete registration % because it has status "%".', OLD.id, OLD.status;
    END IF;

    -- If it IS 'draft', allow the delete
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- 2. Attach the trigger
CREATE TRIGGER prevent_active_registration_deletion
BEFORE DELETE ON registrations
FOR EACH ROW
EXECUTE FUNCTION check_registration_self_deletion();
