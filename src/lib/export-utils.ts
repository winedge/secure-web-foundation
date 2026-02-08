import { format } from 'date-fns';

interface AuditLog {
  id: string;
  action: string;
  entity_type: string;
  entity_id: string | null;
  user_id: string | null;
  details: any;
  created_at: string;
}

interface ConsentLog {
  id: string;
  consent_type: string;
  consented: boolean;
  lead_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export function exportAuditLogsToCSV(logs: AuditLog[], filename?: string): void {
  const headers = ['Timestamp', 'Action', 'Entity Type', 'Entity ID', 'User ID', 'Details'];
  
  const rows = logs.map(log => [
    format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    log.action,
    log.entity_type,
    log.entity_id || '',
    log.user_id || '',
    log.details ? JSON.stringify(log.details) : ''
  ]);

  downloadCSV(headers, rows, filename || `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

export function exportConsentLogsToCSV(logs: ConsentLog[], filename?: string): void {
  const headers = ['Timestamp', 'Consent Type', 'Consented', 'Lead ID', 'IP Address', 'User Agent'];
  
  const rows = logs.map(log => [
    format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
    log.consent_type.toUpperCase(),
    log.consented ? 'Yes' : 'No',
    log.lead_id || '',
    log.ip_address || '',
    log.user_agent || ''
  ]);

  downloadCSV(headers, rows, filename || `consent-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

export function exportLeadsToCSV(leads: any[], filename?: string): void {
  const headers = [
    'Name', 'Email', 'Phone', 'Tort Type', 'State', 'City', 'ZIP',
    'Tier', 'Quality Score', 'Fraud Risk', 'Price', 'Status',
    'Verified', 'Exclusive', 'Created', 'Purchased', 'Amount Paid'
  ];

  const rows = leads.map(lead => [
    `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
    lead.email || '',
    lead.phone || '',
    lead.tort_type || '',
    lead.state || '',
    lead.city || '',
    lead.zip_code || '',
    lead.tier || '',
    String(lead.ai_quality_score || ''),
    String(lead.fraud_risk_score || ''),
    String(lead.price || ''),
    lead.status || '',
    lead.is_verified ? 'Yes' : 'No',
    lead.is_exclusive ? 'Yes' : 'No',
    lead.created_at ? format(new Date(lead.created_at), 'yyyy-MM-dd HH:mm:ss') : '',
    lead.purchaseInfo?.purchased_at ? format(new Date(lead.purchaseInfo.purchased_at), 'yyyy-MM-dd HH:mm:ss') : '',
    String(lead.purchaseInfo?.amount || ''),
  ]);

  downloadCSV(headers, rows, filename || `my-leads-${format(new Date(), 'yyyy-MM-dd')}.csv`);
}

function downloadCSV(headers: string[], rows: string[][], filename: string): void {
  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
