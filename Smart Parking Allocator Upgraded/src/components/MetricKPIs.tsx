import React from 'react';
import { Landmark, Users, TrendingUp, HelpCircle } from 'lucide-react';
import { SlotTier, ParkedVehicle } from '../types';

interface MetricKPIsProps {
  revenue: number;
  occupiedCount: number;
  totalSpots: number;
  occupied: Record<string, ParkedVehicle>;
}

export default function MetricKPIs({ revenue, occupiedCount, totalSpots, occupied }: MetricKPIsProps) {
  const occupancyRate = totalSpots > 0 ? (occupiedCount / totalSpots) * 100 : 0;

  // Let's count occupancy for each tier to determine if surge is active (> 60% of 5 slots, i.e., >= 3 slots)
  const getOccupancyPerTier = (tier: SlotTier) => {
    return (Object.values(occupied) as ParkedVehicle[]).filter((v) => v.tier === tier).length;
  };

  const isSmallSurge = getOccupancyPerTier('small') >= 3;
  const isMediumSurge = getOccupancyPerTier('medium') >= 3;
  const isLargeSurge = getOccupancyPerTier('large') >= 3;

  const anySurge = isSmallSurge || isMediumSurge || isLargeSurge;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {/* Revenue Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Total Revenue
          </span>
          <h2 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
            ₹{revenue.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h2>
          <p className="text-xs text-emerald-600 font-medium">All billing fully verified</p>
        </div>
        <div className="p-4 bg-emerald-50 rounded-2xl text-emerald-600">
          <Landmark className="w-8 h-8" />
        </div>
      </div>

      {/* Active Occupancy Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1 w-full mr-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Active Occupancy
            </span>
            <span className="text-xs font-bold text-slate-700 font-mono">
              {occupiedCount} / {totalSpots} Spots
            </span>
          </div>
          <h2 className="text-3xl font-bold text-slate-900 font-mono tracking-tight">
            {occupancyRate.toFixed(1)}%
          </h2>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                occupancyRate >= 80 ? 'bg-rose-500' : occupancyRate >= 50 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${occupancyRate}%` }}
            ></div>
          </div>
        </div>
        <div className="p-4 bg-indigo-50 rounded-2xl text-indigo-600 flex-shrink-0">
          <Users className="w-8 h-8" />
        </div>
      </div>

      {/* Surge Pricing Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden flex items-center justify-between">
        <div className="space-y-1">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Surge State
          </span>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            {anySurge ? (
              <span className="text-amber-600 animate-pulse">ACTIVE 🚀</span>
            ) : (
              <span className="text-slate-500">STANDARD 🟢</span>
            )}
          </h2>
          <div className="flex flex-wrap gap-1 mt-1">
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                isSmallSurge ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-400'
              }`}
            >
              S: {isSmallSurge ? '1.5x' : '1.0x'}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                isMediumSurge ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-400'
              }`}
            >
              M: {isMediumSurge ? '1.5x' : '1.0x'}
            </span>
            <span
              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                isLargeSurge ? 'bg-amber-100 text-amber-800' : 'bg-slate-50 text-slate-400'
              }`}
            >
              L: {isLargeSurge ? '1.5x' : '1.0x'}
            </span>
          </div>
        </div>
        <div
          className={`p-4 rounded-2xl flex-shrink-0 transition-colors duration-300 ${
            anySurge ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
          }`}
        >
          <TrendingUp className="w-8 h-8" />
        </div>
      </div>
    </div>
  );
}
