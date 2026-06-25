import React, { useState } from 'react';
import { Transaction } from '../types';
import { Table, Search, RotateCcw, AlertCircle, FileText, Download } from 'lucide-react';

interface AuditLedgerProps {
  ledger: Transaction[];
  onClearLedger?: () => void;
}

export default function AuditLedger({ ledger, onClearLedger }: AuditLedgerProps) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter transactions based on search term
  const filteredLedger = ledger.filter((tx) =>
    tx.plate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.slotId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tx.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Download transaction history as CSV
  const downloadCSV = () => {
    if (ledger.length === 0) return;

    const headers = [
      'Transaction ID',
      'License Plate',
      'Vehicle Size',
      'Slot Allocated',
      'Tier',
      'Duration (Hours)',
      'Rate Applied (₹/hr)',
      'Surge Active',
      'Total Paid (₹)',
      'Check-In Time',
      'Check-Out Time'
    ];

    const rows = ledger.map((tx) => [
      tx.id,
      tx.plate,
      tx.type,
      tx.slotId,
      tx.tier.toUpperCase(),
      tx.hoursParked,
      tx.hourlyRate,
      tx.surgeApplied ? 'YES' : 'NO',
      tx.totalFee.toFixed(2),
      tx.checkInTime,
      tx.checkOutTime
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `parking_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between h-full min-h-[400px]">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              📋 System Audit Ledger
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Live database containing all completed, checked-out transaction records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {ledger.length > 0 && (
              <button
                onClick={downloadCSV}
                className="px-2.5 py-1 text-xs text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors flex items-center gap-1 border border-indigo-100 cursor-pointer font-medium"
                title="Download transaction history as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export CSV
              </button>
            )}
            {onClearLedger && ledger.length > 0 && (
              <button
                onClick={onClearLedger}
                className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 rounded-lg transition-colors flex items-center gap-1 border border-rose-100 cursor-pointer font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Search input to filter transaction logs */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by license plate, slot, or vehicle size..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-xs rounded-xl outline-none transition-all text-slate-800"
          />
        </div>

        {/* Table data container */}
        <div className="overflow-x-auto rounded-xl border border-slate-100">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/50 text-slate-500 font-semibold border-b border-slate-100">
                <th className="px-4 py-3 font-medium">License Plate</th>
                <th className="px-4 py-3 font-medium">Vehicle Size</th>
                <th className="px-4 py-3 font-medium">Slot Allocated</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Rate Applied</th>
                <th className="px-4 py-3 text-right font-medium">Total Paid (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 font-mono text-slate-700">
              {filteredLedger.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <FileText className="w-8 h-8 text-slate-300" />
                      <p className="text-xs font-sans text-slate-500">
                        {searchTerm ? 'No matching logs found.' : 'No checkout history. Audit log is empty.'}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredLedger.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/30 transition-all">
                    <td className="px-4 py-3 font-bold text-slate-900 tracking-wider">
                      {tx.plate}
                    </td>
                    <td className="px-4 py-3 text-slate-500 font-sans">
                      {tx.type}
                    </td>
                    <td className="px-4 py-3">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-bold text-slate-800">
                        {tx.slotId}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-sans">
                      {tx.hoursParked} {tx.hoursParked === 1 ? 'hr' : 'hrs'}
                    </td>
                    <td className="px-4 py-3 flex items-center gap-1.5 pt-3.5">
                      <span>₹{tx.hourlyRate}/hr</span>
                      {tx.surgeApplied && (
                        <span className="bg-amber-100 text-amber-800 font-bold text-[9px] px-1 rounded">
                          Surge
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                      ₹{tx.totalFee.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-50 text-[10px] text-slate-400 flex justify-between items-center font-sans">
        <span>Showing {filteredLedger.length} of {ledger.length} total transactions</span>
        <span className="flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> Secure system ledger
        </span>
      </div>
    </div>
  );
}
