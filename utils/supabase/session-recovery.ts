import { createClient } from './client';

// Function to handle corrupted session recovery
export const recoverFromCorruptedSession = async () => {
  if (typeof window === 'undefined') return;

  try {
    const supabase = createClient();
    
    // Try to get current session
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.log('Session error detected, attempting recovery:', error.message);
      
      // Check if it's a refresh token error
      if (error.message.includes('refresh_token_not_found') || 
          error.message.includes('Invalid Refresh Token') ||
          error.message.includes('Refresh Token Not Found')) {
        
        console.log('Clearing corrupted session data...');
        
        // Clear all auth-related storage
        const keysToRemove = [
          'supabase.auth.token',
          'sb-auth-token',
          'supabase-auth-token'
        ];
        
        keysToRemove.forEach(key => {
          try {
            localStorage.removeItem(key);
            sessionStorage.removeItem(key);
          } catch (e) {
            console.warn(`Error removing ${key}:`, e);
          }
        });
        
        // Try to sign out cleanly
        try {
          await supabase.auth.signOut();
          console.log('Successfully signed out corrupted session');
        } catch (signOutError) {
          console.warn('Sign out error (expected):', signOutError);
        }
        
        // Force page reload to start fresh
        setTimeout(() => {
          window.location.reload();
        }, 1000);
        
        return true; // Session was corrupted and cleared
      }
    }
    
    return false; // Session is fine
  } catch (error) {
    console.error('Error during session recovery:', error);
    return false;
  }
};

// Function to check if we need to recover from corrupted session on app start
export const checkAndRecoverSession = async () => {
  if (typeof window === 'undefined') return false;
  
  // Check if we've already tried recovery recently
  const lastRecovery = localStorage.getItem('supabase.session.recovery');
  const now = Date.now();
  
  if (lastRecovery && (now - parseInt(lastRecovery)) < 30000) { // 30 seconds
    console.log('Recent recovery attempt, skipping...');
    return false;
  }
  
  const wasCorrupted = await recoverFromCorruptedSession();
  
  if (wasCorrupted) {
    localStorage.setItem('supabase.session.recovery', now.toString());
  }
  
  return wasCorrupted;
};