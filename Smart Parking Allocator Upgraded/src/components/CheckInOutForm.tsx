import React, { useState } from 'react';
import { VehicleType, ParkedVehicle, SlotTier, AllocationTraceStep } from '../types';
import { LogIn, LogOut, Info, AlertTriangle, CheckCircle2, Ticket } from 'lucide-react';

interface CheckInOutFormProps {
  onCheckIn: (plate: string, type: VehicleType) => void;
  onCheckOut: (plate: string, hours: number) => void;
  occupied: Record<string, ParkedVehicle>;
  getLiveRate: (tier: SlotTier) => { rate: number; surge: boolean };
  getOccupiedCountPerTier: (tier: SlotTier) => number;
  trace: AllocationTraceStep | null;
}

export default function CheckInOutForm({
  onCheckIn,
  onCheckOut,
  occupied,
  getLiveRate,
  getOccupiedCountPerTier,
  trace,
}: CheckInOutFormProps) {
  // Check-in local state
  const [inPlate, setInPlate] = useState('');
  const [inType, setInType] = useState<VehicleType>('Two-Wheeler');
  const [inError, setInError] = useState('');

  // Check-out local state
  const [outPlate, setOutPlate] = useState('');
  const [outHours, setOutHours] = useState<number>(2);
  const [outError, setOutError] = useState('');

  const parkedPlates = Object.keys(occupied);

  // Check-in handler
  const handleCheckInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInError('');

    const trimmedPlate = inPlate.trim().toUpperCase();
    if (!trimmedPlate) {
      setInError('Please enter a valid registration plate number.');
      return;
    }

    // Regex to validate license plates (basic check)
    if (trimmedPlate.length < 4) {
      setInError('Registration number is too short.');
      return;
    }

    if (occupied[trimmedPlate]) {
      setInError(`Vehicle ${trimmedPlate} is already checked in at slot ${occupied[trimmedPlate].slotId}!`);
      return;
    }

    onCheckIn(trimmedPlate, inType);
    setInPlate(''); // clear after success
  };

  // Check-out handler
  const handleCheckOutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOutError('');

    if (!outPlate) {
      setOutError('Please select or enter a parked plate to check out.');
      return;
    }

    onCheckOut(outPlate, outHours);
    setOutPlate(''); // clear selection
    setOutHours(2); // reset slider
  };

  const selectedVehicleDetails = outPlate ? occupied[outPlate] : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* COLUMN 1: Check-In Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <LogIn className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">📥 Vehicle Check-In</h3>
              <p className="text-xs text-slate-500">Allocate closest optimized spot automatically</p>
            </div>
          </div>

          <form onSubmit={handleCheckInSubmit} className="space-y-4 pt-2">
            <div>
              <label htmlFor="in-plate" className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Registration Plate Number
              </label>
              <input
                id="in-plate"
                type="text"
                value={inPlate}
                onChange={(e) => setInPlate(e.target.value)}
                placeholder="e.g., KA-01-AB-1234, DL-3C-YZ-9876"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-800 rounded-xl text-sm font-mono tracking-wider uppercase transition-colors outline-none"
              />
            </div>

            <div>
              <label htmlFor="in-type" className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Vehicle Size / Classification
              </label>
              <select
                id="in-type"
                value={inType}
                onChange={(e) => setInType(e.target.value as VehicleType)}
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-800 rounded-xl text-sm transition-colors outline-none cursor-pointer"
              >
                <option value="Two-Wheeler">🏍️ Two-Wheeler (Base: ₹30/hr)</option>
                <option value="Sedan">🚗 Sedan (Base: ₹60/hr)</option>
                <option value="SUV">🚙 SUV (Base: ₹100/hr)</option>
              </select>
            </div>

            {inError && (
              <div className="flex items-start gap-2 bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-100 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <span>{inError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium text-sm rounded-xl transition-all shadow-sm shadow-indigo-200 hover:shadow-indigo-300 flex items-center justify-center gap-2 cursor-pointer"
            >
              Allocate &amp; Park Slot
            </button>
          </form>
        </div>

        {/* Real-time Allocation Trace explanation */}
        {trace && (
          <div className="mt-4 p-4 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1.5 transition-all duration-300">
            <div className="flex items-center gap-1.5 font-semibold text-slate-700">
              <Info className="w-4 h-4 text-indigo-500" />
              <span>Best-Fit Greedy Trace: {trace.title}</span>
            </div>
            <p className="text-slate-500 leading-relaxed font-mono text-[11px] whitespace-pre-line">
              {trace.description}
            </p>
          </div>
        )}
      </div>

      {/* COLUMN 2: Check-Out Form */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-800">📤 Vehicle Check-Out</h3>
              <p className="text-xs text-slate-500">Calculate hourly bill &amp; free up closest priority slot</p>
            </div>
          </div>

          <form onSubmit={handleCheckOutSubmit} className="space-y-4 pt-2">
            <div>
              <label htmlFor="out-plate" className="block text-xs font-semibold text-slate-500 uppercase mb-1">
                Select Parked Vehicle
              </label>
              {parkedPlates.length === 0 ? (
                <div className="p-3 bg-slate-50 text-slate-400 border border-dashed border-slate-200 rounded-xl text-xs text-center">
                  No vehicles currently parked in system.
                </div>
              ) : (
                <select
                  id="out-plate"
                  value={outPlate}
                  onChange={(e) => setOutPlate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:border-indigo-500 focus:bg-white text-slate-800 rounded-xl text-sm font-mono tracking-wider transition-colors outline-none cursor-pointer"
                >
                  <option value="">-- Choose Parked Car --</option>
                  {parkedPlates.map((plate) => (
                    <option key={plate} value={plate}>
                      {plate} (Slot {occupied[plate].slotId} - {occupied[plate].tier.toUpperCase()})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="out-hours" className="block text-xs font-semibold text-slate-500 uppercase">
                  Simulated Duration
                </label>
                <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                  {outHours} Hours
                </span>
              </div>
              <input
                id="out-hours"
                type="range"
                min="1"
                max="24"
                step="1"
                value={outHours}
                onChange={(e) => setOutHours(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600 focus:outline-none"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                <span>1 Hr</span>
                <span>6 Hrs</span>
                <span>12 Hrs</span>
                <span>18 Hrs</span>
                <span>24 Hrs</span>
              </div>
            </div>

            {selectedVehicleDetails && (
              <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs space-y-2">
                <div className="flex items-center gap-1.5 font-bold text-emerald-800">
                  <Ticket className="w-4 h-4 text-emerald-600" />
                  <span>Invoice Preview: {outPlate}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-emerald-700 font-mono text-[11px]">
                  <div>Slot ID: <span className="font-bold text-slate-800">{selectedVehicleDetails.slotId}</span></div>
                  <div>Tier: <span className="font-bold text-slate-800">{selectedVehicleDetails.tier.toUpperCase()}</span></div>
                  <div>Locked Rate: <span className="font-bold text-slate-800">₹{selectedVehicleDetails.hourlyRate}/hr</span></div>
                  <div>Surge applied: <span className="font-bold text-slate-800">{selectedVehicleDetails.surgeApplied ? 'YES (1.5x)' : 'NO'}</span></div>
                </div>
                <div className="pt-2 border-t border-emerald-100/60 flex justify-between items-center text-emerald-800">
                  <span className="font-semibold text-xs">Estimated Bill:</span>
                  <span className="font-mono font-black text-sm text-slate-900">
                    ₹{(selectedVehicleDetails.hourlyRate * outHours).toFixed(2)}
                  </span>
                </div>
              </div>
            )}

            {outError && (
              <div className="flex items-start gap-2 bg-rose-50 text-rose-800 p-3 rounded-xl border border-rose-100 text-xs">
                <AlertTriangle className="w-4 h-4 text-rose-500 mt-0.5 flex-shrink-0" />
                <span>{outError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={parkedPlates.length === 0}
              className={`w-full py-3 text-white font-medium text-sm rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer ${
                parkedPlates.length === 0
                  ? 'bg-slate-200 border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
                  : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 shadow-emerald-200 hover:shadow-emerald-300'
              }`}
            >
              Process Checkout &amp; Collect Fee
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
