import { ParkingSlot } from '../types';

export class MinHeap {
  private heap: ParkingSlot[] = [];

  constructor(items?: ParkingSlot[]) {
    if (items) {
      this.heap = [...items];
      this.buildHeap();
    }
  }

  private buildHeap() {
    for (let i = Math.floor(this.heap.length / 2) - 1; i >= 0; i--) {
      this.heapifyDown(i);
    }
  }

  public insert(item: ParkingSlot) {
    this.heap.push(item);
    this.heapifyUp(this.heap.length - 1);
  }

  public peek(): ParkingSlot | null {
    return this.heap.length > 0 ? this.heap[0] : null;
  }

  public extractMin(): ParkingSlot | null {
    if (this.heap.length === 0) return null;
    const min = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.heapifyDown(0);
    }
    return min;
  }

  public size(): number {
    return this.heap.length;
  }

  public getItems(): ParkingSlot[] {
    return [...this.heap];
  }

  private heapifyUp(index: number) {
    let current = index;
    while (current > 0) {
      const parent = Math.floor((current - 1) / 2);
      if (this.compare(current, parent) < 0) {
        this.swap(current, parent);
        current = parent;
      } else {
        break;
      }
    }
  }

  private heapifyDown(index: number) {
    let current = index;
    const length = this.heap.length;
    while (true) {
      let smallest = current;
      const left = 2 * current + 1;
      const right = 2 * current + 2;

      if (left < length && this.compare(left, smallest) < 0) {
        smallest = left;
      }
      if (right < length && this.compare(right, smallest) < 0) {
        smallest = right;
      }

      if (smallest !== current) {
        this.swap(current, smallest);
        current = smallest;
      } else {
        break;
      }
    }
  }

  private compare(i: number, j: number): number {
    // Primary compare: Distance (greedy closest slot)
    if (this.heap[i].distance !== this.heap[j].distance) {
      return this.heap[i].distance - this.heap[j].distance;
    }
    // Secondary compare: Lexicographical order of Slot ID
    return this.heap[i].id.localeCompare(this.heap[j].id);
  }

  private swap(i: number, j: number) {
    const temp = this.heap[i];
    this.heap[i] = this.heap[j];
    this.heap[j] = temp;
  }
}
