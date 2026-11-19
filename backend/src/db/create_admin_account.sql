-- =============================================================================
-- IT Service Management Platform — Administrator Account Provisioning Script
-- Dialect: PostgreSQL / PL/pgSQL
-- Schema: itsm
-- Target Table: itsm.users
-- =============================================================================

-- Ensure pgcrypto extension is available for bcrypt generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    v_user_id     UUID := gen_random_uuid();
    v_role_id     UUID;
    v_division_id UUID;
    v_username    TEXT := 'admin';                    -- Administrator username
    v_password    TEXT := 'Admin@123';                 -- Administrator password
    v_email       TEXT := 'admin@mohe.gov.mv';         -- Administrator email
    v_fullname    TEXT := 'System IT Administrator';   -- Full Display Name
    v_password_hash TEXT;
BEGIN
    -- 1. Ensure Schema exists
    CREATE SCHEMA IF NOT EXISTS itsm;

    -- 2. Resolve or create the 'IT Admin' Role
    SELECT id INTO v_role_id 
    FROM itsm.roles 
    WHERE LOWER(name) IN ('it admin', 'it_admin', 'super admin', 'super_admin')
    ORDER BY CASE WHEN LOWER(name) LIKE '%it admin%' THEN 1 ELSE 2 END
    LIMIT 1;

    IF v_role_id IS NULL THEN
        INSERT INTO itsm.roles (id, name, description)
        VALUES ('60441f29-8089-4c9b-bb35-3b9513921398', 'IT Admin', 'IT asset, account and ticket management')
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_role_id;
    END IF;

    -- 3. Resolve or create the 'Information Technology' Division
    SELECT id INTO v_division_id 
    FROM itsm.divisions 
    WHERE LOWER(name) LIKE '%information technology%' 
       OR LOWER(name) LIKE '%it%' 
       OR code = 'IT'
    LIMIT 1;

    IF v_division_id IS NULL THEN
        INSERT INTO itsm.divisions (id, name, code)
        VALUES ('072cebb7-0d11-4569-8353-203d1610ce12', 'Information Technology Division', 'IT')
        ON CONFLICT (name) DO UPDATE SET code = EXCLUDED.code
        RETURNING id INTO v_division_id;
    END IF;

    -- 4. Generate modern bcrypt salted hash ($2a$ / $2b$) using pgcrypto
    BEGIN
        v_password_hash := crypt(v_password, gen_salt('bf', 10));
    EXCEPTION WHEN OTHERS THEN
        -- Fallback to pre-computed bcrypt hash of 'Admin@123' (Salt 10)
        v_password_hash := '$2b$10$uJ3BUNEFDa/rIQfFHETzHun9ICklFv9NUnr8YhNEASwGO0e1HFdFG';
    END;

    -- 5. Insert or Update Administrator Account
    INSERT INTO itsm.users (
        id,
        username,
        email,
        display_name,
        password_hash,
        role_id,
        division_id,
        is_active,
        created_at,
        updated_at
    )
    VALUES (
        v_user_id,
        v_username,
        v_email,
        v_fullname,
        v_password_hash,
        v_role_id,
        v_division_id,
        true,
        NOW(),
        NOW()
    )
    ON CONFLICT (username) DO UPDATE 
    SET 
        role_id       = EXCLUDED.role_id,
        division_id   = EXCLUDED.division_id,
        password_hash = EXCLUDED.password_hash,
        display_name  = EXCLUDED.display_name,
        is_active     = true,
        updated_at    = NOW()
    RETURNING id INTO v_user_id;

    -- 6. Insert Audit Log
    BEGIN
        INSERT INTO itsm.audit_logs (
            user_id,
            action,
            entity_type,
            entity_id,
            description,
            module,
            created_at
        )
        VALUES (
            v_user_id,
            'CREATE',
            'User',
            v_user_id::text,
            'Administrator account created / upgraded via PL/pgSQL script',
            'Security',
            NOW()
        );
    EXCEPTION WHEN OTHERS THEN
        -- Non-blocking if audit_logs table schema varies
        NULL;
    END;

    RAISE NOTICE '=========================================================';
    RAISE NOTICE '✅ Administrator account successfully created / updated!';
    RAISE NOTICE 'Username : %', v_username;
    RAISE NOTICE 'Password : %', v_password;
    RAISE NOTICE 'Role     : IT Admin';
    RAISE NOTICE 'User ID  : %', v_user_id;
    RAISE NOTICE '=========================================================';
END $$;
