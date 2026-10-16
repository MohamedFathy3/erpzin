import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Cookies from 'js-cookie';
import api from '@/lib/api';

/** Records authenticated page visits and browser print-dialog attempts. */
export default function PrintAuditTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!Cookies.get('token')) return;
    void api.post('/audit/page-view', {
      page: location.pathname,
      occurred_at: new Date().toISOString(),
    }).catch(() => {
      // Navigation should remain available if the audit endpoint is offline.
    });
  }, [location.pathname]);

  useEffect(() => {
    const recordPrint = () => {
      if (!Cookies.get('token')) return;
      void api.post('/audit/print', {
        document_title: document.title,
        page: window.location.pathname,
        occurred_at: new Date().toISOString(),
      }).catch(() => {
        // Printing must remain available even if the audit endpoint is offline.
      });
    };

    window.addEventListener('afterprint', recordPrint);
    return () => window.removeEventListener('afterprint', recordPrint);
  }, []);

  return null;
}
