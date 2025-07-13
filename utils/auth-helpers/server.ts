'use server';

import { createClient } from '@/utils/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getURL, getErrorRedirect, getStatusRedirect } from 'utils/helpers';
import { getAuthTypes } from 'utils/auth-helpers/settings';

function isValidEmail(email: string) {
  var regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
  return regex.test(email);
}

export async function redirectToPath(path: string) {
  return redirect(path);
}

export async function SignOut(formData: FormData) {
  const pathName = String(formData.get('pathName')).trim();

  const supabase = createClient();
  const { error } = await supabase.auth.signOut();

  if (error) {
    return getErrorRedirect(
      pathName,
      'Hmm... Something went wrong.',
      'You could not be signed out.'
    );
  }

  return '/signin';
}

export async function signInWithEmail(formData: FormData) {
  const cookieStore = cookies();
  const callbackURL = getURL('/auth/callback');

  const email = String(formData.get('email')).trim();
  let redirectPath: string;

  if (!isValidEmail(email)) {
    redirectPath = getErrorRedirect(
      '/signin/email_signin',
      'Invalid email address.',
      'Please try again.'
    );
  }

  const supabase = createClient();
  let options = {
    emailRedirectTo: callbackURL,
    shouldCreateUser: true
  };

  // If allowPassword is false, do not create a new user
  const { allowPassword } = getAuthTypes();
  if (allowPassword) options.shouldCreateUser = false;
  const { data, error } = await supabase.auth.signInWithOtp({
    email,
    options: options
  });

  if (error) {
    redirectPath = getErrorRedirect(
      '/signin/email_signin',
      'You could not be signed in.',
      error.message
    );
  } else if (data) {
    cookieStore.set('preferredSignInView', 'email_signin', { path: '/' });
    redirectPath = getStatusRedirect(
      '/signin/email_signin',
      'Success!',
      'Please check your email for a magic link. You may now close this tab.',
      true
    );
  } else {
    redirectPath = getErrorRedirect(
      '/signin/email_signin',
      'Hmm... Something went wrong.',
      'You could not be signed in.'
    );
  }

  return redirectPath;
}

export async function requestPasswordUpdate(formData: FormData) {
  const callbackURL = getURL('/auth/reset_password');

  // Get form data
  const email = String(formData.get('email')).trim();
  let redirectPath: string;

  if (!isValidEmail(email)) {
    redirectPath = getErrorRedirect(
      '/signin/forgot_password',
      'Invalid email address.',
      'Please try again.'
    );
  }

  const supabase = createClient();

  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: callbackURL
  });

  if (error) {
    redirectPath = getErrorRedirect(
      '/signin/forgot_password',
      error.message,
      'Please try again.'
    );
  } else if (data) {
    redirectPath = getStatusRedirect(
      '/signin/forgot_password',
      'Success!',
      'Please check your email for a password reset link. You may now close this tab.',
      true
    );
  } else {
    redirectPath = getErrorRedirect(
      '/signin/forgot_password',
      'Hmm... Something went wrong.',
      'Password reset email could not be sent.'
    );
  }

  return redirectPath;
}

export async function signInWithPassword(formData: FormData) {
  const cookieStore = cookies();
  const email = String(formData.get('email')).trim();
  const password = String(formData.get('password')).trim();
  const nextUrl = String(formData.get('next') || '').trim();
  let redirectPath: string;

  const supabase = createClient();
  const { error, data } = await supabase.auth.signInWithPassword({
    email,
    password
  });

  if (error) {
    redirectPath = getErrorRedirect(
      '/signin/password_signin',
      'Sign in failed.',
      error.message
    );
  } else if (data.user) {
    cookieStore.set('preferredSignInView', 'password_signin', { path: '/' });
    
    // If there's a next URL and it's a valid internal path, redirect there
    if (nextUrl && nextUrl.startsWith('/') && !nextUrl.startsWith('//')) {
      redirectPath = getStatusRedirect(nextUrl, 'Success!', 'You are now signed in.');
    } else {
      redirectPath = getStatusRedirect('/dashboard', 'Success!', 'You are now signed in.');
    }
  } else {
    redirectPath = getErrorRedirect(
      '/signin/password_signin',
      'Hmm... Something went wrong.',
      'You could not be signed in.'
    );
  }

  return redirectPath;
}

export async function signUp(formData: FormData) {
  const callbackURL = getURL('/auth/callback');

  const email = String(formData.get('email')).trim();
  const password = String(formData.get('password')).trim();
  const referralCode = String(formData.get('referralCode') || '').trim();
  
  console.log('🔍 Form data received:');
  console.log('🔍 - Email:', email);
  console.log('🔍 - Password:', password ? '[HIDDEN]' : '[EMPTY]');
  console.log('🔍 - Referral Code:', referralCode || '[EMPTY]');
  
  let redirectPath: string;

  if (!isValidEmail(email)) {
    redirectPath = getErrorRedirect(
      '/signin/signup',
      'Invalid email address.',
      'Please try again.'
    );
  }

  const supabase = createClient();
  
  // Create service role client for referral operations
  const serviceSupabase = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
  
  // Validate referral code if provided
  let validReferralCode = false;
  let referrerId = null;
  if (referralCode) {
    console.log('🔍 Validating referral code:', referralCode);
    try {
      const { data: referralData, error: referralError } = await serviceSupabase
        .from('referral_codes')
        .select('user_id, is_active')
        .eq('code', referralCode)
        .eq('is_active', true)
        .single();

      console.log('🔍 Referral validation result:', { referralData, referralError });

      if (!referralError && referralData) {
        validReferralCode = true;
        referrerId = referralData.user_id;
        console.log('✅ Valid referral code found, referrer ID:', referrerId);
      } else {
        console.error('❌ Invalid referral code during signup:', referralError);
        // Check if referral code exists but is inactive
        const { data: inactiveCode } = await serviceSupabase
          .from('referral_codes')
          .select('is_active')
          .eq('code', referralCode)
          .single();
        
        if (inactiveCode) {
          console.log('🔍 Referral code exists but is inactive');
        } else {
          console.log('🔍 Referral code does not exist in database');
        }
      }
    } catch (error) {
      console.error('❌ Error validating referral code:', error);
    }
  } else {
    console.log('🔍 No referral code provided');
  }

  const { data: authData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackURL,
      data: {
        full_name: '',
        avatar_url: '',
        referred_by: validReferralCode ? referralCode : null
      }
    }
  });

  if (signUpError) {
    redirectPath = getErrorRedirect(
      '/signin/signup',
      'Sign up failed.',
      signUpError.message
    );
  } else if (authData.user) {
    // If there's a valid referral code, create the referral record
    if (validReferralCode && referrerId) {
      console.log('🔍 Creating referral record for user:', authData.user.id);
      console.log('🔍 Referrer ID:', referrerId);
      console.log('🔍 Referral code:', referralCode);
      
      try {
        console.log('🔍 Attempting to insert referral record...');
        const { data: referralData, error: referralError } = await serviceSupabase
          .from('referrals')
          .insert({
            referrer_id: referrerId,
            referee_id: authData.user.id,
            referral_code: referralCode,
            status: 'pending' // Start with pending status
          })
          .select();

        if (referralError) {
          console.error('❌ Error creating referral record:', referralError);
          console.error('❌ Error details:', {
            code: referralError.code,
            message: referralError.message,
            details: referralError.details,
            hint: referralError.hint
          });
        } else {
          console.log('✅ Referral record created successfully:', referralData);
          
          // Get current clicks count and increment
          const { data: currentData } = await serviceSupabase
            .from('referral_codes')
            .select('clicks')
            .eq('code', referralCode)
            .single();

          const newClicks = (currentData?.clicks || 0) + 1;
          console.log('🔍 Updating click count from', currentData?.clicks || 0, 'to', newClicks);
          
          const { error: updateError } = await serviceSupabase
            .from('referral_codes')
            .update({ clicks: newClicks })
            .eq('code', referralCode);
            
          if (updateError) {
            console.error('❌ Error updating click count:', updateError);
          } else {
            console.log('✅ Click count updated successfully');
          }
        }
      } catch (error) {
        console.error('❌ Error handling referral:', error);
      }
    } else {
      console.log('🔍 No valid referral code provided or referrer not found');
      console.log('🔍 validReferralCode:', validReferralCode);
      console.log('🔍 referrerId:', referrerId);
    }

    redirectPath = getStatusRedirect(
      '/auth/callback',
      'Success!',
      'Please check your email to confirm your sign up.'
    );
  } else {
    redirectPath = getErrorRedirect(
      '/signin/signup',
      'Hmm... Something went wrong.',
      'You could not be signed up.'
    );
  }

  return redirectPath;
}

export async function updatePassword(formData: FormData) {
  const password = String(formData.get('password')).trim();
  const passwordConfirm = String(formData.get('passwordConfirm')).trim();
  let redirectPath: string;

  console.log('🔍 Password update attempt:');
  console.log('🔍 - Password length:', password.length);
  console.log('🔍 - Password confirm length:', passwordConfirm.length);
  console.log('🔍 - Passwords match:', password === passwordConfirm);

  // Check that the password and confirmation match
  if (password !== passwordConfirm) {
    redirectPath = getErrorRedirect(
      '/signin/update_password',
      'Your password could not be updated.',
      'Passwords do not match.'
    );
    return redirectPath;
  }

  // Check password length
  if (password.length < 6) {
    redirectPath = getErrorRedirect(
      '/signin/update_password',
      'Your password could not be updated.',
      'Password must be at least 6 characters long.'
    );
    return redirectPath;
  }

  const supabase = createClient();
  
  // Check if user is authenticated
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  
  if (userError || !user) {
    console.error('❌ User not authenticated for password update:', userError);
    redirectPath = getErrorRedirect(
      '/signin/update_password',
      'Authentication required.',
      'Please sign in to update your password.'
    );
    return redirectPath;
  }

  console.log('🔍 User authenticated, updating password for:', user.email);

  const { error, data } = await supabase.auth.updateUser({
    password
  });

  if (error) {
    console.error('❌ Password update error:', error);
    redirectPath = getErrorRedirect(
      '/signin/update_password',
      'Your password could not be updated.',
      error.message
    );
  } else if (data.user) {
    console.log('✅ Password updated successfully for:', data.user.email);
    redirectPath = getStatusRedirect(
      '/dashboard',
      'Success!',
      'Your password has been updated.'
    );
  } else {
    console.error('❌ No user data returned from password update');
    redirectPath = getErrorRedirect(
      '/signin/update_password',
      'Hmm... Something went wrong.',
      'Your password could not be updated.'
    );
  }

  return redirectPath;
}

export async function updateEmail(formData: FormData) {
  // Get form data
  const newEmail = String(formData.get('newEmail')).trim();

  // Check that the email is valid
  if (!isValidEmail(newEmail)) {
    return getErrorRedirect(
      '/account',
      'Your email could not be updated.',
      'Invalid email address.'
    );
  }

  const supabase = createClient();

  const callbackUrl = getURL(
    getStatusRedirect('/account', 'Success!', `Your email has been updated.`)
  );

  const { error } = await supabase.auth.updateUser(
    { email: newEmail },
    {
      emailRedirectTo: callbackUrl
    }
  );

  if (error) {
    return getErrorRedirect(
      '/account',
      'Your email could not be updated.',
      error.message
    );
  } else {
    return getStatusRedirect(
      '/account',
      'Confirmation emails sent.',
      `You will need to confirm the update by clicking the links sent to both the old and new email addresses.`
    );
  }
}

export async function updateName(formData: FormData) {
  // Get form data
  const fullName = String(formData.get('fullName')).trim();

  const supabase = createClient();
  const { error, data } = await supabase.auth.updateUser({
    data: { full_name: fullName }
  });

  if (error) {
    return getErrorRedirect(
      '/account',
      'Your name could not be updated.',
      error.message
    );
  } else if (data.user) {
    return getStatusRedirect(
      '/account',
      'Success!',
      'Your name has been updated.'
    );
  } else {
    return getErrorRedirect(
      '/account',
      'Hmm... Something went wrong.',
      'Your name could not be updated.'
    );
  }
}
