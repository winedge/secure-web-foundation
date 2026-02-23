import { useState, useMemo } from 'react';
import { useToast } from './use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useFirm } from './use-firm';
import { useMutation } from '@tanstack/react-query';

// --- Mock data generators ---
export interface GoogleCampaign {
  id: string;
  name: string;
  type: 'search' | 'display' | 'video' | 'performance_max' | 'shopping';
  status: 'active' | 'paused' | 'draft' | 'ended';
  daily_budget: number;
  total_spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: number;
  cpc: number;
  cpa: number;
  roas: number;
  quality_score: number;
  tort_type: string;
  target_states: string[];
  bid_strategy: string;
  start_date: string;
  ai_recommendations?: any;
  learning_data?: any;
}

export interface GoogleAdGroup {
  id: string;
  campaign_id: string;
  name: string;
  status: string;
  keywords: GoogleKeyword[];
  ads: GoogleAd[];
  cpc: number;
  clicks: number;
  impressions: number;
  conversions: number;
  quality_score: number;
}

export interface GoogleKeyword {
  id: string;
  text: string;
  match_type: 'broad' | 'phrase' | 'exact';
  bid: number;
  quality_score: number;
  impressions: number;
  clicks: number;
  cpc: number;
  conversions: number;
  status: 'active' | 'paused';
}

export interface GoogleAd {
  id: string;
  ad_group_id: string;
  type: 'responsive_search' | 'responsive_display' | 'video';
  headlines: string[];
  descriptions: string[];
  final_url: string;
  display_url: string;
  status: string;
  impressions: number;
  clicks: number;
  conversions: number;
  ai_score: number;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

const tortTypes = ['Camp Lejeune', 'Roundup', 'Talcum Powder', 'AFFF', 'Paraquat', 'NEC Baby Formula'];
const bidStrategies = ['Maximize Conversions', 'Target CPA', 'Target ROAS', 'Maximize Clicks', 'Enhanced CPC'];
const states = ['FL', 'TX', 'CA', 'NY', 'IL', 'PA', 'OH', 'GA', 'NC', 'MI'];

function mockCampaigns(): GoogleCampaign[] {
  return [
    { id: generateId(), name: 'Camp Lejeune - Search National', type: 'search', status: 'active', daily_budget: 150, total_spend: 4200, impressions: 89000, clicks: 3200, conversions: 128, ctr: 3.6, cpc: 1.31, cpa: 32.81, roas: 4.2, quality_score: 8, tort_type: 'Camp Lejeune', target_states: ['FL', 'NC', 'CA'], bid_strategy: 'Maximize Conversions', start_date: '2026-01-15' },
    { id: generateId(), name: 'Roundup - Display Awareness', type: 'display', status: 'active', daily_budget: 80, total_spend: 2100, impressions: 245000, clicks: 4800, conversions: 67, ctr: 1.96, cpc: 0.44, cpa: 31.34, roas: 3.8, quality_score: 7, tort_type: 'Roundup', target_states: ['TX', 'CA', 'IL'], bid_strategy: 'Target CPA', start_date: '2026-01-20' },
    { id: generateId(), name: 'Talcum Powder - Performance Max', type: 'performance_max', status: 'active', daily_budget: 200, total_spend: 5600, impressions: 320000, clicks: 8900, conversions: 245, ctr: 2.78, cpc: 0.63, cpa: 22.86, roas: 5.1, quality_score: 9, tort_type: 'Talcum Powder', target_states: ['NY', 'PA', 'OH'], bid_strategy: 'Target ROAS', start_date: '2026-02-01' },
    { id: generateId(), name: 'AFFF Firefighter - Search', type: 'search', status: 'paused', daily_budget: 100, total_spend: 1800, impressions: 45000, clicks: 1500, conversions: 42, ctr: 3.33, cpc: 1.20, cpa: 42.86, roas: 2.9, quality_score: 6, tort_type: 'AFFF', target_states: ['GA', 'MI'], bid_strategy: 'Enhanced CPC', start_date: '2026-01-10' },
    { id: generateId(), name: 'NEC Formula - Video Ads', type: 'video', status: 'draft', daily_budget: 120, total_spend: 0, impressions: 0, clicks: 0, conversions: 0, ctr: 0, cpc: 0, cpa: 0, roas: 0, quality_score: 0, tort_type: 'NEC Baby Formula', target_states: ['CA', 'TX', 'FL'], bid_strategy: 'Maximize Conversions', start_date: '2026-02-15' },
  ];
}

function mockAdGroups(campaignId: string): GoogleAdGroup[] {
  return [
    {
      id: generateId(), campaign_id: campaignId, name: 'High Intent Keywords', status: 'active',
      cpc: 2.45, clicks: 1200, impressions: 34000, conversions: 89, quality_score: 8,
      keywords: [
        { id: generateId(), text: 'camp lejeune lawyer', match_type: 'exact', bid: 3.50, quality_score: 9, impressions: 12000, clicks: 480, cpc: 2.80, conversions: 38, status: 'active' },
        { id: generateId(), text: 'camp lejeune water contamination lawsuit', match_type: 'phrase', bid: 2.80, quality_score: 8, impressions: 8000, clicks: 320, cpc: 2.20, conversions: 24, status: 'active' },
        { id: generateId(), text: 'toxic water lawsuit', match_type: 'broad', bid: 1.50, quality_score: 6, impressions: 14000, clicks: 400, cpc: 1.10, conversions: 12, status: 'active' },
      ],
      ads: [
        { id: generateId(), ad_group_id: '', type: 'responsive_search', headlines: ['Free Camp Lejeune Case Review', 'Were You Stationed at Camp Lejeune?', 'Get Compensation You Deserve'], descriptions: ['Exposed to contaminated water? You may qualify for significant compensation. Free consultation.', 'Our attorneys have recovered millions for veterans. No fees unless we win.'], final_url: 'https://example.com/camp-lejeune', display_url: 'example.com/camp-lejeune', status: 'active', impressions: 18000, clicks: 720, conversions: 54, ai_score: 92 },
      ],
    },
    {
      id: generateId(), campaign_id: campaignId, name: 'Broad Awareness', status: 'active',
      cpc: 1.20, clicks: 800, impressions: 55000, conversions: 28, quality_score: 7,
      keywords: [
        { id: generateId(), text: 'military lawsuit', match_type: 'broad', bid: 1.00, quality_score: 7, impressions: 20000, clicks: 300, cpc: 0.90, conversions: 10, status: 'active' },
        { id: generateId(), text: 'contaminated water claims', match_type: 'phrase', bid: 1.80, quality_score: 7, impressions: 15000, clicks: 250, cpc: 1.40, conversions: 9, status: 'active' },
      ],
      ads: [
        { id: generateId(), ad_group_id: '', type: 'responsive_search', headlines: ['Water Contamination Claims', 'Military Base Lawsuits', 'Free Legal Consultation'], descriptions: ['If you lived near a military base with water contamination, contact us today.', 'Experienced attorneys fighting for justice. Call now for a free case review.'], final_url: 'https://example.com/claims', display_url: 'example.com/claims', status: 'active', impressions: 35000, clicks: 500, conversions: 18, ai_score: 78 },
      ],
    },
  ];
}

function mockAnalyticsData(days = 30) {
  const data = [];
  for (let i = days; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const impressions = Math.floor(Math.random() * 8000) + 3000;
    const clicks = Math.floor(impressions * (Math.random() * 0.04 + 0.015));
    const conversions = Math.floor(clicks * (Math.random() * 0.08 + 0.02));
    const spend = Math.round((Math.random() * 120 + 40) * 100) / 100;
    data.push({
      date: d.toISOString().split('T')[0],
      impressions, clicks, conversions, spend,
      ctr: Math.round((clicks / impressions) * 10000) / 100,
      cpc: clicks > 0 ? Math.round((spend / clicks) * 100) / 100 : 0,
      cpa: conversions > 0 ? Math.round((spend / conversions) * 100) / 100 : 0,
      roas: conversions > 0 ? Math.round((conversions * 150 / spend) * 100) / 100 : 0,
      quality_score: Math.floor(Math.random() * 3) + 7,
      search_impression_share: Math.round((Math.random() * 30 + 50) * 100) / 100,
    });
  }
  return data;
}

function mockAutopilotLogs() {
  return [
    { id: generateId(), action: 'pause_keyword', target: '"toxic water lawsuit"', reason: 'CPA $48.50 exceeded $35 target over 7 days. Quality Score dropped to 5.', timestamp: new Date(Date.now() - 3600000).toISOString(), ai_confidence: 0.92 },
    { id: generateId(), action: 'increase_bid', target: '"camp lejeune lawyer" (exact)', reason: 'Top performer: CPA $18.20, conversion rate 7.9%. Increasing bid 15% to capture more impression share.', timestamp: new Date(Date.now() - 7200000).toISOString(), ai_confidence: 0.88 },
    { id: generateId(), action: 'add_negative_keyword', target: '"camp lejeune housing"', reason: 'Detected 340 irrelevant clicks costing $412. Adding as negative to all ad groups.', timestamp: new Date(Date.now() - 14400000).toISOString(), ai_confidence: 0.95 },
    { id: generateId(), action: 'new_ad_variant', target: 'Ad Group: High Intent', reason: 'Ad fatigue detected (CTR declined 22% over 14 days). Generated new RSA variant with refreshed headlines.', timestamp: new Date(Date.now() - 28800000).toISOString(), ai_confidence: 0.85 },
    { id: generateId(), action: 'budget_reallocation', target: 'Campaign budget', reason: 'Shifted $30/day from Display to Search based on 3x higher ROAS in Search over the past 14 days.', timestamp: new Date(Date.now() - 43200000).toISOString(), ai_confidence: 0.91 },
  ];
}

// Hooks using local state + mock data
export function useGoogleCampaigns() {
  const [campaigns] = useState<GoogleCampaign[]>(mockCampaigns);
  return { data: campaigns, isLoading: false };
}

export function useGoogleAdGroups(campaignId?: string) {
  const adGroups = useMemo(() => campaignId ? mockAdGroups(campaignId) : [], [campaignId]);
  return { data: adGroups, isLoading: false };
}

export function useGoogleAnalytics() {
  const data = useMemo(() => mockAnalyticsData(), []);
  return { data, isLoading: false };
}

export function useGoogleAutopilotLogs() {
  const data = useMemo(() => mockAutopilotLogs(), []);
  return { data, isLoading: false };
}

export function useGoogleAiAssistant() {
  const { toast } = useToast();
  const { data: firm } = useFirm();

  return useMutation({
    mutationFn: async ({ action, context }: { action: string; context: any }) => {
      const { data, error } = await supabase.functions.invoke('google-ads-ai', {
        body: { action, context, firm_id: firm?.id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data.result;
    },
    onError: (e: any) => toast({ title: 'AI Error', description: e.message, variant: 'destructive' }),
  });
}
