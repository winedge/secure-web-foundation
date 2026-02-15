import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useSubmitAiFeedback } from '@/hooks/use-ai-feedback';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';

interface Props {
  actionType: string;
  recommendation: any;
  campaignId?: string;
  wasApplied?: boolean;
}

export function AiFeedbackButtons({ actionType, recommendation, campaignId, wasApplied }: Props) {
  const submitFeedback = useSubmitAiFeedback();
  const [feedbackText, setFeedbackText] = useState('');
  const [submitted, setSubmitted] = useState<string | null>(null);
  const [showComment, setShowComment] = useState(false);

  const handleRate = (rating: 'positive' | 'negative') => {
    submitFeedback.mutate({
      action_type: actionType,
      recommendation,
      campaign_id: campaignId,
      rating,
      feedback_text: feedbackText || undefined,
      was_applied: wasApplied,
    });
    setSubmitted(rating);
  };

  if (submitted) {
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {submitted === 'positive' ? <ThumbsUp className="h-3.5 w-3.5 text-green-500" /> : <ThumbsDown className="h-3.5 w-3.5 text-red-500" />}
        <span>Feedback recorded - AI is learning</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs text-muted-foreground mr-1">Rate this:</span>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRate('positive')}>
        <ThumbsUp className="h-3.5 w-3.5" />
      </Button>
      <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => handleRate('negative')}>
        <ThumbsDown className="h-3.5 w-3.5" />
      </Button>
      <Popover open={showComment} onOpenChange={setShowComment}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
            <MessageSquare className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-64" align="end">
          <div className="space-y-2">
            <p className="text-xs font-medium">Add comment (optional)</p>
            <Textarea value={feedbackText} onChange={e => setFeedbackText(e.target.value)} placeholder="What could be better?" rows={2} className="text-xs" />
            <div className="flex gap-1.5">
              <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { handleRate('positive'); setShowComment(false); }}>
                <ThumbsUp className="h-3 w-3 mr-1" />Good
              </Button>
              <Button size="sm" variant="outline" className="flex-1 h-7 text-xs" onClick={() => { handleRate('negative'); setShowComment(false); }}>
                <ThumbsDown className="h-3 w-3 mr-1" />Bad
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
