import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MFAChallenge } from '@/components/auth/MFAChallenge';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';
import logoImg from '@/assets/leadthru-logo.png';
import { supabase } from '@/integrations/supabase/client';
import { Fingerprint } from 'lucide-react';
import { isWebAuthnSupported, authenticateWithWebAuthn } from '@/lib/webauthn';
import { unlockEncryption } from '@/lib/crypto/zero-knowledge';

const signInSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isSignUp, setIsSignUp] = useState(searchParams.get('mode') === 'signup');
  const [isLoading, setIsLoading] = useState(false);
  const [showMFA, setShowMFA] = useState(false);
  const [showWebAuthn, setShowWebAuthn] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, user } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  const signInForm = useForm<z.infer<typeof signInSchema>>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const signUpForm = useForm<z.infer<typeof signUpSchema>>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', fullName: '' },
  });

  const handleSignIn = async (data: z.infer<typeof signInSchema>) => {
    setIsLoading(true);
    const { error } = await signIn(data.email, data.password);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      // Check if MFA is required
      const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      if (aalData?.currentLevel === 'aal1' && aalData?.nextLevel === 'aal2') {
        setShowMFA(true);
        return;
      }

      // Check if user has WebAuthn credentials
      const { data: userData } = await supabase.auth.getUser();
      if (userData?.user && isWebAuthnSupported()) {
        const { data: creds } = await (supabase as any)
          .from('webauthn_credentials')
          .select('id')
          .eq('user_id', userData.user.id)
          .limit(1);
        
        if (creds?.length > 0) {
          setShowWebAuthn(true);
          return;
        }
      }

      // Try to unlock ZK encryption if configured
      if (userData?.user) {
        try {
          const { data: encKey } = await (supabase as any)
            .from('firm_encryption_keys')
            .select('encrypted_master_key, key_salt')
            .eq('user_id', userData.user.id)
            .maybeSingle();
          
          if (encKey) {
            const pqcSk = localStorage.getItem(`zk_pqc_sk_${userData.user.id}`);
            await unlockEncryption(encKey.encrypted_master_key, encKey.key_salt, data.password, pqcSk || undefined);
          }
        } catch {}
      }

      toast.success('Welcome back!');
      navigate('/dashboard');
    }
  };

  const handleWebAuthnVerify = async () => {
    setIsLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error('Not authenticated');
      
      const result = await authenticateWithWebAuthn(userData.user.id);
      if (result.success) {
        toast.success('Biometric verified!');
        navigate('/dashboard');
      } else {
        toast.error(result.error || 'Verification failed');
      }
    } catch (err: any) {
      toast.error(err.message);
    }
    setIsLoading(false);
  };

  const handleSignUp = async (data: z.infer<typeof signUpSchema>) => {
    setIsLoading(true);
    const { error } = await signUp(data.email, data.password, data.fullName);
    setIsLoading(false);
    
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Redirecting...');
      navigate('/onboarding');
    }
  };

  return (
    <div className="min-h-screen gradient-bg flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center justify-center mb-8">
          <img src={logoImg} alt="LeadThru" className="h-10" />
        </Link>

        {showWebAuthn ? (
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="flex items-center justify-center gap-2">
                <Fingerprint className="h-5 w-5" />
                Biometric Verification
              </CardTitle>
              <CardDescription>
                Please verify your identity with your registered passkey or hardware key.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button onClick={handleWebAuthnVerify} className="w-full" disabled={isLoading}>
                <Fingerprint className="h-4 w-4 mr-2" />
                {isLoading ? 'Verifying...' : 'Verify with Passkey'}
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => { setShowWebAuthn(false); navigate('/dashboard'); }}
              >
                Skip for now
              </Button>
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>{isSignUp ? 'Create an Account' : 'Welcome Back'}</CardTitle>
            <CardDescription>
              {isSignUp 
                ? 'Start accessing verified leads today' 
                : 'Sign in to your account to continue'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isSignUp ? (
              <form onSubmit={signUpForm.handleSubmit(handleSignUp)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="fullName" className="text-sm font-medium leading-none">
                    Full Name
                  </label>
                  <Input
                    id="fullName"
                    placeholder="John Doe"
                    {...signUpForm.register('fullName')}
                  />
                  {signUpForm.formState.errors.fullName && (
                    <p className="text-sm font-medium text-destructive">
                      {signUpForm.formState.errors.fullName.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none">
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@lawfirm.com"
                    {...signUpForm.register('email')}
                  />
                  {signUpForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">
                      {signUpForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none">
                    Password
                  </label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    {...signUpForm.register('password')}
                  />
                  {signUpForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {signUpForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="confirmPassword" className="text-sm font-medium leading-none">
                    Confirm Password
                  </label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    {...signUpForm.register('confirmPassword')}
                  />
                  {signUpForm.formState.errors.confirmPassword && (
                    <p className="text-sm font-medium text-destructive">
                      {signUpForm.formState.errors.confirmPassword.message}
                    </p>
                  )}
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>
            ) : (
              <form onSubmit={signInForm.handleSubmit(handleSignIn)} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="signInEmail" className="text-sm font-medium leading-none">
                    Email
                  </label>
                  <Input
                    id="signInEmail"
                    type="email"
                    placeholder="you@lawfirm.com"
                    {...signInForm.register('email')}
                  />
                  {signInForm.formState.errors.email && (
                    <p className="text-sm font-medium text-destructive">
                      {signInForm.formState.errors.email.message}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <label htmlFor="signInPassword" className="text-sm font-medium leading-none">
                    Password
                  </label>
                  <Input
                    id="signInPassword"
                    type="password"
                    placeholder="••••••••"
                    {...signInForm.register('password')}
                  />
                  {signInForm.formState.errors.password && (
                    <p className="text-sm font-medium text-destructive">
                      {signInForm.formState.errors.password.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end">
                  <Link to="/reset-password" className="text-sm text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </Button>
              </form>
            )}

            <div className="mt-6 text-center text-sm">
              {isSignUp ? (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setIsSignUp(false)}
                  >
                    Sign in
                  </button>
                </p>
              ) : (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    className="font-medium text-primary hover:underline"
                    onClick={() => setIsSignUp(true)}
                  >
                    Sign up
                  </button>
                </p>
              )}
            </div>
          </CardContent>
        </Card>
        )
      </div>
    </div>
  );
}
