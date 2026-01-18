import { Campaign } from '@/hooks/use-campaigns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/utils';
import { MapPin, Users, DollarSign, Calendar, MoreVertical, Edit, Trash2, Play, Pause } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
  onToggleStatus: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onEdit, onDelete, onToggleStatus }: CampaignCardProps) {
  const getStatusColor = (status: string | null) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'paused':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      case 'completed':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      default:
        return 'bg-muted text-muted-foreground border-muted';
    }
  };

  const isActive = campaign.status === 'active';

  return (
    <Card className="group hover:shadow-md transition-shadow">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div className="space-y-1">
          <CardTitle className="text-lg font-semibold">{campaign.name}</CardTitle>
          <Badge variant="outline" className="font-medium">
            {campaign.tort_type}
          </Badge>
        </div>
        <div className="flex items-center gap-2">
          <Badge className={getStatusColor(campaign.status)}>
            {campaign.status || 'draft'}
          </Badge>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(campaign)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Campaign
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleStatus(campaign)}>
                {isActive ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause Campaign
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Activate Campaign
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => onDelete(campaign)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Campaign
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              {campaign.target_states?.length 
                ? campaign.target_states.slice(0, 3).join(', ') + (campaign.target_states.length > 3 ? '...' : '')
                : 'All states'}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>
              {campaign.target_age_min && campaign.target_age_max
                ? `Ages ${campaign.target_age_min}-${campaign.target_age_max}`
                : 'All ages'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2 border-t">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Daily Budget</p>
            <p className="font-semibold">
              {campaign.daily_budget ? formatCurrency(campaign.daily_budget) : 'No limit'}
            </p>
          </div>
          <div className="space-y-1 text-right">
            <p className="text-xs text-muted-foreground">Total Budget</p>
            <p className="font-semibold">
              {campaign.total_budget ? formatCurrency(campaign.total_budget) : 'No limit'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground pt-2 border-t">
          <Calendar className="h-3 w-3" />
          <span>Created {new Date(campaign.created_at).toLocaleDateString()}</span>
        </div>
      </CardContent>
    </Card>
  );
}
