-- Backfill referral codes for existing users who don't have them yet

DO $$
DECLARE
    user_record RECORD;
    new_code TEXT;
BEGIN
    -- Loop through all users who don't have referral codes yet
    FOR user_record IN 
        SELECT u.id, u.full_name 
        FROM users u 
        LEFT JOIN referral_codes rc ON u.id = rc.user_id 
        WHERE rc.user_id IS NULL
    LOOP
        -- Generate a referral code for this user
        new_code := generate_referral_code(user_record.full_name);
        
        -- Insert the referral code
        INSERT INTO referral_codes (user_id, code)
        VALUES (user_record.id, new_code);
        
        -- Update the user's referral_code field
        UPDATE users 
        SET referral_code = new_code 
        WHERE id = user_record.id;
        
        RAISE NOTICE 'Created referral code % for user %', new_code, user_record.id;
    END LOOP;
END $$; 