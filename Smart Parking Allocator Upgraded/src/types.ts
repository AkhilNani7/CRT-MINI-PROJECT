export type VehicleType = 'Two-Wheeler' | 'Sedan' | 'SUV';
export type SlotTier = 'small' | 'medium' | 'large';

export interface ParkingSlot {
  id: string;
  tier: SlotTier;
  distance: number;
}

export interface ParkedVehicle {
  plate: string;
  type: VehicleType;
  slotId: string;
  tier: SlotTier;
  distance: number;
  checkInTime: string; // ISO string
  hourlyRate: number;
  surgeApplied: boolean;
}

export interface Transaction {
  id: string;
  plate: string;
  type: VehicleType;
  slotId: string;
  tier: SlotTier;
  checkInTime: string;
  checkOutTime: string;
  hoursParked: number;
  hourlyRate: number;
  surgeApplied: boolean;
  totalFee: number;
}

export interface AllocationTraceStep {
  title: string;
  status: 'info' | 'success' | 'warning' | 'error';
  description: string;
}
