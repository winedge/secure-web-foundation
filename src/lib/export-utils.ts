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
