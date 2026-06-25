import React, { useState, useEffect } from 'react';
import { VehicleType, SlotTier, ParkingSlot, ParkedVehicle, Transaction, AllocationTraceStep } from './types';
import { MinHeap } from './utils/MinHeap';
import MetricKPIs from './components/MetricKPIs';
import CheckInOutForm from './components/CheckInOutForm';
import ParkingGrid from './components/ParkingGrid';
import AuditLedger from './components/AuditLedger';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  onSnapshot, 
  updateDoc, 
  writeBatch, 
  increment 
} from 'firebase/firestore';
import {
  Sparkles,
  RefreshCw,
  Zap,
  CheckCircle
} from 'lucide-react';

// Predefined slots with their initial distance metrics (the heap priority key)
const INITIAL_SLOTS: Record<SlotTier, ParkingSlot[]> = {
  small: [
    { id: 'S-1', tier: 'small', distance: 1 },
    { id: 'S-2', tier: 'small', distance: 3 },
    { id: 'S-3', tier: 'small', distance: 5 },
    { id: 'S-4', tier: 'small', distance: 7 },
    { id: 'S-5', tier: 'small', distance: 9 },
  ],
  medium: [
    { id: 'M-1', tier: 'medium', distance: 2 },
    { id: 'M-2', tier: 'medium', distance: 4 },
    { id: 'M-3', tier: 'medium', distance: 6 },
    { id: 'M-4', tier: 'medium', distance: 8 },
    { id: 'M-5', tier: 'medium', distance: 10 },
  ],
  large: [
    { id: 'L-1', tier: 'large', distance: 3 },
    { id: 'L-2', tier: 'large', distance: 6 },
    { id: 'L-3', tier: 'large', distance: 9 },
    { id: 'L-4', tier: 'large', distance: 12 },
    { id: 'L-5', tier: 'large', distance: 15 },
  ],
};

const BASE_PRICES: Record<SlotTier, number> = {
  small: 30,
  medium: 60,
  large: 100,
};

export default function App() {
  const [dbLoading, setDbLoading] = useState(true);

  // Application cloud state synced with Firestore
  const [availableSlots, setAvailableSlots] = useState<Record<SlotTier, ParkingSlot[]>>(INITIAL_SLOTS);
  const [occupiedVehicles, setOccupiedVehicles] = useState<Record<string, ParkedVehicle>>({});
  const [revenue, setRevenue] = useState<number>(0.0);
  const [ledger, setLedger] = useState<Transaction[]>([]);

  // Recent action Trace state to showcase algorithmic steps
  const [trace, setTrace] = useState<AllocationTraceStep | null>(null);

  // Success alert states
  const [alert, setAlert] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  // Helper selector for seeding Firestore if empty
  const seedDatabase = async () => {
    const batch = writeBatch(db);
    
    // Seed slots
    const allInitialSlots = [
      ...INITIAL_SLOTS.small,
      ...INITIAL_SLOTS.medium,
      ...INITIAL_SLOTS.large
    ];

    allInitialSlots.forEach((slot) => {
      const docRef = doc(db, 'slots', slot.id);
      batch.set(docRef, {
        id: slot.id,
        tier: slot.tier,
        distance: slot.distance,
        occupied: false,
        parkedPlate: null,
        parkedType: null,
        parkedAt: null,
        hourlyRate: null,
        surgeApplied: null
      });
    });

    // Seed stats/global
    const statsRef = doc(db, 'stats', 'global');
    batch.set(statsRef, {
      revenue: 0
    });

    await batch.commit();
  };

  // 1. Real-time Firestore sync
  useEffect(() => {
    setDbLoading(true);

    const unsubscribeSlots = onSnapshot(collection(db, 'slots'), async (snapshot) => {
      if (snapshot.empty) {
        await seedDatabase();
        return;
      }

      const slotsList: any[] = [];
      snapshot.forEach((doc) => {
        slotsList.push(doc.data());
      });

      const newAvailable: Record<SlotTier, ParkingSlot[]> = {
        small: [],
        medium: [],
        large: []
      };

      const newOccupied: Record<string, ParkedVehicle> = {};

      slotsList.forEach((slotData) => {
        if (slotData.occupied) {
          newOccupied[slotData.parkedPlate] = {
            plate: slotData.parkedPlate,
            type: slotData.parkedType,
            slotId: slotData.id,
            tier: slotData.tier,
            distance: slotData.distance,
            checkInTime: slotData.parkedAt,
            hourlyRate: slotData.hourlyRate,
            surgeApplied: slotData.surgeApplied
          };
        } else {
          newAvailable[slotData.tier as SlotTier].push({
            id: slotData.id,
            tier: slotData.tier,
            distance: slotData.distance
          });
        }
      });

      // Sort available slots by distance ascending (Min-Heap behavior)
      const sortFn = (a: ParkingSlot, b: ParkingSlot) => a.distance - b.distance;
      newAvailable.small.sort(sortFn);
      newAvailable.medium.sort(sortFn);
      newAvailable.large.sort(sortFn);

      setAvailableSlots(newAvailable);
      setOccupiedVehicles(newOccupied);
      setDbLoading(false);
    }, (error) => {
      console.error("Firestore snapshot error on slots: ", error);
    });

    const unsubscribeLedger = onSnapshot(collection(db, 'ledger'), (snapshot) => {
      const txs: Transaction[] = [];
      snapshot.forEach((doc) => {
        txs.push({ id: doc.id, ...doc.data() } as Transaction);
      });

      // Sort ledger by checkout time descending
      txs.sort((a, b) => new Date(b.checkOutTime).getTime() - new Date(a.checkOutTime).getTime());
      setLedger(txs);
    });

    const unsubscribeStats = onSnapshot(doc(db, 'stats', 'global'), (docSnap) => {
      if (docSnap.exists()) {
        setRevenue(docSnap.data().revenue || 0);
      }
    });

    return () => {
      unsubscribeSlots();
      unsubscribeLedger();
      unsubscribeStats();
    };
  }, []);

  // Helper selectors
  const getOccupiedCountPerTier = (tier: SlotTier) => {
    return (Object.values(occupiedVehicles) as ParkedVehicle[]).filter((v) => v.tier === tier).length;
  };

  const getLiveRate = (tier: SlotTier) => {
    const count = getOccupiedCountPerTier(tier);
    const base = BASE_PRICES[tier];
    const isSurge = count >= 3; // 60% of 5 slots = 3 slots
    return {
      rate: isSurge ? Math.floor(base * 1.5) : base,
      surge: isSurge,
    };
  };

  // 1. ALLOCATION: Best-Fit Greedy Strategy (Firestore Sync)
  const handleCheckIn = async (plate: string, type: VehicleType) => {
    let targetTiers: SlotTier[] = [];
    if (type === 'Two-Wheeler') {
      targetTiers = ['small', 'medium', 'large'];
    } else if (type === 'Sedan') {
      targetTiers = ['medium', 'large'];
    } else if (type === 'SUV') {
      targetTiers = ['large'];
    }

    let allocatedSlot: ParkingSlot | null = null;
    let allocatedTier: SlotTier | null = null;
    let traceSteps: string[] = [];

    traceSteps.push(`🔍 [Cloud Firestore] Initiated Allocation Search for ${type} [${plate}]`);
    traceSteps.push(`📋 Preferred tiers: ${targetTiers.map(t => t.toUpperCase()).join(' ➔ ')}`);

    for (const tier of targetTiers) {
      const slotsInTier = availableSlots[tier];
      traceSteps.push(`⚡ Checking ${tier.toUpperCase()} Tier (Available slots in live heap: ${slotsInTier.length})`);

      if (slotsInTier.length > 0) {
        // Instantiate a Min-Heap to extract the spot with smallest distance in O(1) peek or O(log N) extract
        const heap = new MinHeap(slotsInTier);
        const closestSlot = heap.extractMin();

        if (closestSlot) {
          allocatedSlot = closestSlot;
          allocatedTier = tier;
          traceSteps.push(`✅ GREEDY MATCH: Closest slot in ${tier.toUpperCase()} is ${closestSlot.id} at distance ${closestSlot.distance}m.`);
          break;
        }
      } else {
        traceSteps.push(`❌ ${tier.toUpperCase()} Tier is currently fully occupied! Fallback activated.`);
      }
    }

    if (allocatedSlot && allocatedTier) {
      const livePricing = getLiveRate(allocatedTier);

      const slotRef = doc(db, 'slots', allocatedSlot.id);
      try {
        await updateDoc(slotRef, {
          occupied: true,
          parkedPlate: plate,
          parkedType: type,
          parkedAt: new Date().toISOString(),
          hourlyRate: livePricing.rate,
          surgeApplied: livePricing.surge
        });

        const surgeMsg = livePricing.surge ? ' (🔥 Surge pricing of 1.5x active!)' : '';

        setAlert({
          type: 'success',
          message: `Allocated ${type} [${plate}] to slot ${allocatedSlot.id} (${allocatedSlot.distance}m away) at ₹${livePricing.rate}/hr${surgeMsg}!`,
        });

        setTrace({
          title: `Allocation Success: ${plate}`,
          status: 'success',
          description: traceSteps.join('\n'),
        });
      } catch (err: any) {
        console.error("Firestore Check-in Error: ", err);
        setAlert({
          type: 'info',
          message: `Database error during check-in: ${err.message}`,
        });
      }
    } else {
      setAlert({
        type: 'info',
        message: `Allocation Failed: No available slots fit a ${type} currently!`,
      });

      setTrace({
        title: `Allocation Failed`,
        status: 'error',
        description: [...traceSteps, `❌ CRITICAL ERROR: All compatible priority parking spaces are completely full!`].join('\n'),
      });
    }
  };

  // 2. CHECK-OUT: Free up slot and record transaction in Firestore
  const handleCheckOut = async (plate: string, hours: number) => {
    const vehicle = occupiedVehicles[plate];
    if (!vehicle) return;

    const finalFee = vehicle.hourlyRate * hours;
    const checkoutTime = new Date().toISOString();

    const batch = writeBatch(db);

    // 1. Reset slot document
    const slotRef = doc(db, 'slots', vehicle.slotId);
    batch.update(slotRef, {
      occupied: false,
      parkedPlate: null,
      parkedType: null,
      parkedAt: null,
      hourlyRate: null,
      surgeApplied: null
    });

    // 2. Add transaction record to ledger collection
    const ledgerRef = doc(collection(db, 'ledger'));
    batch.set(ledgerRef, {
      plate: vehicle.plate,
      type: vehicle.type,
      slotId: vehicle.slotId,
      tier: vehicle.tier,
      checkInTime: vehicle.checkInTime,
      checkOutTime: checkoutTime,
      hoursParked: hours,
      hourlyRate: vehicle.hourlyRate,
      surgeApplied: vehicle.surgeApplied,
      totalFee: finalFee
    });

    // 3. Update global revenue stat atomically
    const statsRef = doc(db, 'stats', 'global');
    batch.update(statsRef, {
      revenue: increment(finalFee)
    });

    try {
      await batch.commit();

      setAlert({
        type: 'success',
        message: `Checked out ${vehicle.type} [${plate}]. Paid ₹${finalFee.toFixed(2)} for ${hours} hours. Spot ${vehicle.slotId} is now available!`,
      });

      setTrace({
        title: `Checkout Event: ${plate}`,
        status: 'info',
        description: `🔓 Slot ${vehicle.slotId} was liberated and pushed back into the ${vehicle.tier.toUpperCase()} Min-Heap.\n💰 Total Bill generated: ₹${vehicle.hourlyRate} * ${hours} hours = ₹${finalFee}.\n📈 Cumulated secured revenue is now ₹${(revenue + finalFee).toFixed(2)}.`,
      });
    } catch (err: any) {
      console.error("Firestore Check-out Error: ", err);
      setAlert({
        type: 'info',
        message: `Database error during checkout: ${err.message}`,
      });
    }
  };

  // Reset the simulator to default
  const handleReset = async () => {
    const batch = writeBatch(db);

    // Reset slots
    const allInitialSlots = [
      ...INITIAL_SLOTS.small,
      ...INITIAL_SLOTS.medium,
      ...INITIAL_SLOTS.large
    ];

    allInitialSlots.forEach((slot) => {
      const docRef = doc(db, 'slots', slot.id);
      batch.update(docRef, {
        occupied: false,
        parkedPlate: null,
        parkedType: null,
        parkedAt: null,
        hourlyRate: null,
        surgeApplied: null
      });
    });

    // Reset stats/global
    const statsRef = doc(db, 'stats', 'global');
    batch.update(statsRef, {
      revenue: 0
    });

    // Delete all ledger items
    ledger.forEach((tx) => {
      const txRef = doc(db, 'ledger', tx.id);
      batch.delete(txRef);
    });

    try {
      await batch.commit();
      setTrace(null);
      setAlert({
        type: 'info',
        message: 'Cloud Database reset completed successfully!',
      });
    } catch (err: any) {
      console.error("Firestore Reset Error: ", err);
      setAlert({
        type: 'info',
        message: 'Database reset failed.',
      });
    }
  };

  // Seed system with initial simulated occupied slots in Firestore
  const handleQuickSeed = async () => {
    const batch = writeBatch(db);

    // Seed 3 Small slots
    const seedSmall = [
      { id: 'S-1', plate: 'KA-51-MM-1111', type: 'Two-Wheeler' },
      { id: 'S-2', plate: 'MH-12-JJ-2222', type: 'Two-Wheeler' },
      { id: 'S-3', plate: 'DL-03-AA-3333', type: 'Two-Wheeler' },
    ];

    seedSmall.forEach((s) => {
      const ref = doc(db, 'slots', s.id);
      batch.update(ref, {
        occupied: true,
        parkedPlate: s.plate,
        parkedType: s.type,
        parkedAt: new Date(Date.now() - 2 * 3600000).toISOString(),
        hourlyRate: 30,
        surgeApplied: false
      });
    });

    // Seed 1 Medium Sedan
    const refMedium = doc(db, 'slots', 'M-1');
    batch.update(refMedium, {
      occupied: true,
      parkedPlate: 'TS-08-CC-4444',
      parkedType: 'Sedan',
      parkedAt: new Date(Date.now() - 4 * 3600000).toISOString(),
      hourlyRate: 60,
      surgeApplied: false
    });

    try {
      await batch.commit();

      setAlert({
        type: 'success',
        message: 'System pre-seeded in Firestore! Small Tier occupancy reached 60%, triggering Surge Rates (1.5x) for subsequent small vehicles!',
      });

      setTrace({
        title: 'Quick Seed Applied (Cloud)',
        status: 'success',
        description: `💡 Seeding completed!\nSmall Tier occupies 3/5 slots (60%).\n🚨 Small Tier Surge Pricing activated. Any new Two-Wheelers checking in will lock in the ₹45/hr rate!`,
      });
    } catch (err: any) {
      console.error("Firestore Seeding Error: ", err);
      setAlert({
        type: 'info',
        message: 'Database seeding failed.',
      });
    }
  };

  const totalSpots = 15;
  const activeOccupancy = Object.keys(occupiedVehicles).length;

  if (dbLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center font-sans">
        <div className="text-center space-y-4">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin mx-auto" />
          <p className="text-sm text-slate-400">Loading Cloud Parking Database...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 antialiased selection:bg-indigo-100 font-sans pb-16">
      {/* Dynamic Header */}
      <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-indigo-500/20 shadow-lg flex items-center justify-center">
              <Zap className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight">Smart Parking Simulator</h1>
                <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-bold px-2 py-0.5 rounded border border-indigo-500/30 font-mono">
                  v1.2-cloud
                </span>
              </div>
              <p className="text-xs text-slate-400">Best-Fit Greedy Priority Heap &amp; Surge Pricing</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Cloud Synced
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8 space-y-8">
        {/* Alerts / Notifications */}
        {alert && (
          <div
            className={`flex items-start justify-between p-4 rounded-xl border animate-fade-in transition-all ${
              alert.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-indigo-50 border-indigo-200 text-indigo-800'
            }`}
          >
            <div className="flex items-center gap-3">
              <CheckCircle className={`w-5 h-5 flex-shrink-0 ${alert.type === 'success' ? 'text-emerald-600' : 'text-indigo-600'}`} />
              <span className="text-xs font-medium font-sans leading-relaxed">{alert.message}</span>
            </div>
            <button
              onClick={() => setAlert(null)}
              className="text-slate-400 hover:text-slate-600 text-sm ml-4 transition-colors font-semibold"
            >
              &times;
            </button>
          </div>
        )}

        <div className="space-y-8">
          {/* KPI Section */}
          <MetricKPIs
            revenue={revenue}
            occupiedCount={activeOccupancy}
            totalSpots={totalSpots}
            occupied={occupiedVehicles}
          />

          {/* Quick action triggers */}
          <div className="flex flex-wrap gap-3 items-center bg-white border border-slate-100 p-4 rounded-2xl shadow-sm justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Simulation Controller:
              </span>
              <span className="text-xs text-slate-400">
                Quickly trigger and test state scenarios in the Cloud.
              </span>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleQuickSeed}
                className="px-4 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 active:bg-indigo-200 text-xs font-bold rounded-xl border border-indigo-100 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                Pre-seed 60% Occupancy (Trigger Surge)
              </button>
              <button
                onClick={handleReset}
                className="px-4 py-2 bg-slate-50 text-slate-600 hover:bg-slate-100 active:bg-slate-200 text-xs font-bold rounded-xl border border-slate-200 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset System
              </button>
            </div>
          </div>

          {/* Inputs Section */}
          <CheckInOutForm
            onCheckIn={handleCheckIn}
            onCheckOut={handleCheckOut}
            occupied={occupiedVehicles}
            getLiveRate={getLiveRate}
            getOccupiedCountPerTier={getOccupiedCountPerTier}
            trace={trace}
          />

          {/* Layout Grid & Audit log section */}
          <div className="grid grid-cols-1 xl:grid-cols-5 gap-8">
            <div className="xl:col-span-2">
              <ParkingGrid slots={availableSlots} occupied={occupiedVehicles} />
            </div>
            <div className="xl:col-span-3">
              <AuditLedger ledger={ledger} onClearLedger={handleReset} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
