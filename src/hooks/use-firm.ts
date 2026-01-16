import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { toast } from 'sonner';

export interface Firm {
  id: string;
  name: string;
  website: string | null;
  states: string[];
  practice_type: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  subscription_plan: 'basic' | 'premium';
  subscription_status: string;
  wallet_balance: number;
  created_at: string;
}

export function useFirm() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['firm', user?.id],
    queryFn: async () => {
      if (!user) return null;

      // First get the firm membership
      const { data: membership, error: membershipError } = await supabase
        .from('firm_members')
        .select('firm_id, is_owner')
        .eq('user_id', user.id)
        .maybeSingle();

      if (membershipError) throw membershipError;
      if (!membership) return null;

      // Then get the firm details
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .select('*')
        .eq('id', membership.firm_id)
        .single();

      if (firmError) throw firmError;

      return {
        ...firm,
        isOwner: membership.is_owner,
      } as Firm & { isOwner: boolean };
    },
    enabled: !!user,
  });
}

export function useCreateFirm() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (firmData: {
      name: string;
      website?: string;
      states?: string[];
      practice_type?: string;
      contact_email?: string;
      contact_phone?: string;
    }) => {
      if (!user) throw new Error('Not authenticated');

      // Create the firm
      const { data: firm, error: firmError } = await supabase
        .from('firms')
        .insert({
          name: firmData.name,
          website: firmData.website || null,
          states: firmData.states || [],
          practice_type: firmData.practice_type || null,
          contact_email: firmData.contact_email || null,
          contact_phone: firmData.contact_phone || null,
        })
        .select()
        .single();

      if (firmError) throw firmError;

      // Add user as firm owner
      const { error: memberError } = await supabase
        .from('firm_members')
        .insert({
          firm_id: firm.id,
          user_id: user.id,
          is_owner: true,
        });

      if (memberError) throw memberError;

      // Add firm_owner role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: user.id,
          role: 'firm_owner',
        });

      if (roleError && !roleError.message.includes('duplicate')) throw roleError;

      return firm;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['firm'] });
      queryClient.invalidateQueries({ queryKey: ['user-role'] });
      toast.success('Firm created successfully!');
    },
    onError: (error) => {
      toast.error('Failed to create firm: ' + error.message);
    },
  });
}
