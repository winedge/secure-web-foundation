import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth-context';
import { useFirm } from './use-firm';
import { toast } from 'sonner';
import type { PipelineStage } from '@/components/leads/PipelineStageCards';

// Configurable fees per stage transition
export const STAGE_FEES: Partial<Record<string, number>> = {
  'new_lead->call_verification': 50,
  'call_verification->medical_records': 200,
  'medical_records->retainer': 0,
};

export function getStageTransitionFee(fromStage: PipelineStage, toStage: PipelineStage): number {
  return STAGE_FEES[`${fromStage}->${toStage}`] ?? 0;
}

export function useChargeAndMoveStage() {
  const { user } = useAuth();
  const { data: firm } = useFirm();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ leadId, fromStage, toStage }: { leadId: string; fromStage: PipelineStage; toStage: PipelineStage }) => {
      if (!user || !firm) throw new Error('Not authenticated');

      const fee = getStageTransitionFee(fromStage, toStage);

      // If no fee, just move directly
      if (fee === 0) {
        const { error } = await supabase
          .from('lead_purchases')
          .update({ pipeline_stage: toStage, stage_updated_at: new Date().toISOString() })
          .eq('lead_id', leadId)
          .eq('firm_id', firm.id);
        if (error) throw error;
        return { success: true, amount: 0, payment_method: 'free' };
      }

      // Try wallet first via atomic DB function
      const { data, error } = await supabase.rpc('charge_and_move_stage', {
        _lead_id: leadId,
        _user_id: user.id,
        _firm_id: firm.id,
        _from_stage: fromStage,
        _to_stage: toStage,
        _charge_amount: fee,
      });

      if (error) throw error;

      const result = data as any;

      if (result.success) {
        return { success: true, amount: fee, payment_method: 'wallet', new_balance: result.new_balance };
      }

      // Insufficient balance - fall back to Stripe
      if (result.reason === 'insufficient_balance') {
        const stageLabels: Record<string, string> = {
          call_verification: 'Call Verification',
          medical_records: 'Medical Record Retrieval',
        };
        
        const { data: checkoutData, error: checkoutError } = await supabase.functions.invoke('create-checkout', {
          body: {
            amount: fee,
            metadata: {
              type: 'pipeline_charge',
              lead_id: leadId,
              from_stage: fromStage,
              to_stage: toStage,
            },
          },
        });

        if (checkoutError) throw checkoutError;
        if (checkoutData?.url) {
          window.open(checkoutData.url, '_blank');
          return { 
            success: false, 
            reason: 'stripe_redirect', 
            message: `Insufficient wallet balance ($${result.balance?.toFixed(2)}). Redirecting to payment for $${fee} ${stageLabels[toStage] || toStage} fee.`,
          };
        }

        throw new Error('Failed to create payment session');
      }

      throw new Error(result.reason || 'Unknown error');
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['purchased-leads'] });
      queryClient.invalidateQueries({ queryKey: ['firm'] });
      
      if (result.success && result.amount > 0) {
        toast.success(`Lead moved successfully. $${result.amount} charged from wallet.`);
      } else if (result.success) {
        toast.success('Lead moved successfully');
      } else if ((result as any).reason === 'stripe_redirect') {
        toast.info((result as any).message);
      }
    },
    onError: (error) => {
      toast.error('Failed to move lead: ' + error.message);
    },
  });
}
