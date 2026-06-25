import React from 'react';
import { ParkingSlot, ParkedVehicle, SlotTier } from '../types';
import { Car, Bike, ShieldAlert } from 'lucide-react';

interface ParkingGridProps {
  slots: {
    small: ParkingSlot[];
    medium: ParkingSlot[];
    large: ParkingSlot[];
  };
  occupied: Record<string, ParkedVehicle>;
}

export default function ParkingGrid({ slots, occupied }: ParkingGridProps) {
  // Let's retrieve all slots pre-defined per tier to match full layouts (5 per tier)
  const tiers: { key: SlotTier; label: string; basePrice: number }[] = [
    { key: 'small', label: 'Small Slots (Base: ₹30/hr)', basePrice: 30 },
    { key: 'medium', label: 'Medium Slots (Base: ₹60/hr)', basePrice: 60 },
    { key: 'large', label: 'Large Slots (Base: ₹100/hr)', basePrice: 100 },
  ];

  // Helper to check if a specific slot ID is occupied, and returns the parked vehicle
  const getOccupant = (slotId: string) => {
    return (Object.values(occupied) as ParkedVehicle[]).find((v) => v.slotId === slotId);
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-8">
      <div>
        <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
          🗺️ Live Parking Layout Grid
        </h3>
        <p className="text-xs text-slate-500 mt-1">
          Visualizing real-time allocation status. Closest available spot is automatically prioritized.
        </p>
      </div>

      <div className="space-y-6">
        {tiers.map((tier) => {
          // Total slots in this tier is 5 (defined in initial state)
          const totalInTier = 5;
          const occupiedCount = (Object.values(occupied) as ParkedVehicle[]).filter((v) => v.tier === tier.key).length;
          const occupancyRate = (occupiedCount / totalInTier) * 100;
          const isSurge = occupancyRate >= 60;

          // Let's gather the static 5 spots per tier so we preserve their absolute positions
          const tierSpots = slots[tier.key];

          return (
            <div key={tier.key} className="space-y-3">
              <div className="flex justify-between items-center bg-slate-50 px-4 py-2 rounded-xl">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {tier.label}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-500">
                    Occupancy: {occupiedCount}/{totalInTier}
                  </span>
                  {isSurge ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 animate-pulse border border-amber-200">
                      <ShieldAlert className="w-3 h-3" />
                      SURGE 1.5x ACTIVE (₹{Math.floor(tier.basePrice * 1.5)}/hr)
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      Standard Rate
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                {tierSpots.map((spot) => {
                  const occupant = getOccupant(spot.id);

                  if (occupant) {
                    return (
                      <div
                        key={spot.id}
                        id={`slot-${spot.id}`}
                        className="bg-red-50 hover:bg-red-100/80 border-2 border-red-200 hover:border-red-300 rounded-xl p-3 text-center transition-all duration-300 shadow-sm flex flex-col justify-between min-h-[120px]"
                      >
                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs font-mono font-bold bg-red-200 text-red-800 px-1.5 py-0.5 rounded">
                              {spot.id}
                            </span>
                            {occupant.type === 'Two-Wheeler' ? (
                              <Bike className="w-4 h-4 text-red-500" />
                            ) : (
                              <Car className="w-4 h-4 text-red-500" />
                            )}
                          </div>
                          <p className="text-xs font-mono font-bold text-red-900 tracking-wider break-all leading-tight">
                            {occupant.plate}
                          </p>
                          <p className="text-[10px] text-red-600 mt-1">{occupant.type}</p>
                        </div>
                        <div className="mt-2 pt-1.5 border-t border-red-100/50 flex flex-col items-center">
                          <span className="text-xs font-semibold text-red-800">
                            ₹{occupant.hourlyRate}/hr
                          </span>
                          {occupant.surgeApplied && (
                            <span className="text-[9px] font-bold text-amber-700 leading-none">
                              Surge applied
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={spot.id}
                      id={`slot-${spot.id}`}
                      className="bg-emerald-50/50 hover:bg-emerald-50 border border-dashed border-emerald-300 hover:border-emerald-400 rounded-xl p-3 text-center transition-all duration-300 flex flex-col justify-between min-h-[120px]"
                    >
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                            {spot.id}
                          </span>
                        </div>
                        <p className="text-xs font-semibold text-emerald-800">AVAILABLE</p>
                        <p className="text-[10px] text-slate-500 mt-1">{spot.distance}m away</p>
                      </div>
                      <div className="mt-2 pt-1.5 border-t border-emerald-100/30 flex flex-col items-center">
                        <span className="text-xs font-medium text-emerald-700">
                          ₹{isSurge ? Math.floor(tier.basePrice * 1.5) : tier.basePrice}/hr
                        </span>
                        <span className="text-[9px] text-slate-400">Next Rate</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
