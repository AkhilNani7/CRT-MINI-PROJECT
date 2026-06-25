import streamlit as st
import pandas as pd
import sqlite3
from datetime import datetime, timedelta

# Set page configuration for an executive widescreen layout
st.set_page_config(page_title="Revenue & Parking Control Center", page_icon="💰", layout="wide")

DB_FILE = "parking_system.db"

# --- DATABASE INITIALIZATION ENGINE ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Create Parking Lot Configuration Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS parking_lot (
        id TEXT PRIMARY KEY,
        size TEXT,
        distance INTEGER,
        occupied INTEGER DEFAULT 0,
        vehicle_assigned TEXT,
        entry_time TEXT
    )
    """)
    
    # Create Audit Ledger Table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS transaction_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT,
        vehicle_id TEXT,
        spot_id TEXT,
        duration REAL,
        amount_charged REAL
    )
    """)
    
    # Seed individual spots if the lot table is completely empty
    cursor.execute("SELECT COUNT(*) FROM parking_lot")
    if cursor.fetchone()[0] == 0:
        initial_spots = [
            ("A1", "Compact", 5),
            ("A2", "Compact", 12),
            ("B1", "Medium", 3),
            ("B2", "Medium", 8),
            ("B3", "Medium", 15),
            ("C1", "Large", 7),
            ("C2", "Large", 20),
        ]
        cursor.executemany("INSERT INTO parking_lot (id, size, distance) VALUES (?, ?, ?)", initial_spots)
    
    conn.commit()
    conn.close()

# Invoke database configuration at runtime
init_db()

# --- SYSTEM CONFIGURATIONS ---
SIZE_HIERARCHY = {"Compact": 1, "Medium": 2, "Large": 3}
RATE_CARD = {"Compact": 5.00, "Medium": 8.50, "Large": 12.00}

# --- DATABASE HELPER READ/WRITE OPERATIONS ---
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row  # Access query data columns by key strings
    return conn

def fetch_all_spots():
    conn = get_db_connection()
    spots = conn.execute("SELECT * FROM parking_lot").fetchall()
    conn.close()
    return [dict(spot) for spot in spots]

def fetch_occupied_spots():
    conn = get_db_connection()
    spots = conn.execute("SELECT * FROM parking_lot WHERE occupied = 1").fetchall()
    conn.close()
    return [dict(spot) for spot in spots]

def fetch_revenue_and_logs():
    conn = get_db_connection()
    logs = conn.execute("SELECT timestamp, vehicle_id, spot_id, duration, amount_charged FROM transaction_history ORDER BY id DESC").fetchall()
    revenue_row = conn.execute("SELECT SUM(amount_charged) FROM transaction_history").fetchone()
    conn.close()
    
    total_rev = revenue_row[0] if revenue_row[0] is not None else 0.0
    history = [dict(log) for log in logs]
    return total_rev, history

# --- APP HEADER ---
st.title("📊  Parking Terminal & Revenue Auditing System (SQL Enabled)")
st.caption("🔒 Automated Space Management backed by Persistent SQLite Storage Layer")

# --- RELOAD STATE FROM SQL TRANSACTIONS ---
parking_lot_state = fetch_all_spots()
occupied_spots = [s for s in parking_lot_state if s["occupied"] == 1]
total_revenue, transaction_history = fetch_revenue_and_logs()

total_spots = len(parking_lot_state)
occupied_count = len(occupied_spots)
available_count = total_spots - occupied_count

# --- FINANCIAL & CAPACITY METRICS ---
m1, m2, m3, m4 = st.columns(4)
m1.metric("Gross Revenue Collected", f"${total_revenue:,.2f}")
m2.metric("Available Inventory", f"{available_count} Slots", delta=f"{available_count} Free")
m3.metric("Live Occupancy", f"{occupied_count} Vehicles", delta=f"{occupied_count} Active", delta_color="inverse")
m4.metric("Facility Load Factor", f"{int((occupied_count / total_spots) * 100) if total_spots > 0 else 0}%")

st.markdown("---")

# --- MAIN INTERFACE SPLIT ---
col_controls, col_visuals = st.columns([1, 1.3])

with col_controls:
    st.subheader("🕹️ Terminal Operation Deck")
    tab1, tab2, tab3 = st.tabs(["📥 Check-In Vehicle", "📤 Check-Out & Bill", "🏷️ Revenue Information"])
    
    with tab1:
        with st.form("allocation_form", clear_on_submit=True):
            vehicle_id = st.text_input("Vehicle Registration Number", placeholder="e.g., TS-09-EX-1234")
            vehicle_size = st.selectbox("Vehicle Size Group", ["Compact", "Medium", "Large"])
            sim_hours = st.slider("Simulate entry from how many hours ago? (For test billing)", 0, 24, 0)
            submit_park = st.form_submit_button("Greedy Space Allocation", use_container_width=True)
            
            if submit_park:
                if not vehicle_id.strip():
                    st.error("Operation Denied: Valid identification plate required.")
                else:
                    # GREEDY SELECTION MECHANISM OUT OF LOADED SQL RECORDS
                    best_spot = None
                    min_distance = float('inf')
                    required_val = SIZE_HIERARCHY[vehicle_size]
                    
                    for spot in parking_lot_state:
                        if spot["occupied"] == 0 and SIZE_HIERARCHY[spot["size"]] >= required_val:
                            if spot["distance"] < min_distance:
                                min_distance = spot["distance"]
                                best_spot = spot
                                
                    if best_spot:
                        calculated_entry = (datetime.now() - timedelta(hours=sim_hours)).strftime("%Y-%m-%d %H:%M:%S")
                        
                        # Commit update statement permanently down to file system
                        conn = get_db_connection()
                        conn.execute("""
                            UPDATE parking_lot 
                            SET occupied = 1, vehicle_assigned = ?, entry_time = ? 
                            WHERE id = ?
                        """, (vehicle_id.strip().upper(), calculated_entry, best_spot["id"]))
                        conn.commit()
                        conn.close()
                        
                        st.success(f"✅ **Spot {best_spot['id']} Allocated Successfully!** \n\nDistance to terminal: **{best_spot['distance']}m**. Saved persistently inside SQLite database.")
                        st.rerun()
                    else:
                        st.error("🚨 **Allocation Denied:** All compatible spots are currently filled.")

    with tab2:
        if occupied_spots:
            with st.form("vacate_form", clear_on_submit=True):
                spot_options = {spot["id"]: f"Slot {spot['id']} ({spot['vehicle_assigned']})" for spot in occupied_spots}
                selected_spot_id = st.selectbox("Identify Occupied Spot", options=list(spot_options.keys()), format_func=lambda x: spot_options[x])
                submit_vacate = st.form_submit_button("Generate Bill & Release", use_container_width=True)
                
                if submit_vacate:
                    # Find matching spot in current memory subset array
                    target_spot = next(s for s in occupied_spots if s["id"] == selected_spot_id)
                    
                    # Compute duration metrics 
                    entry_dt = datetime.strptime(target_spot["entry_time"], "%Y-%m-%d %H:%M:%S")
                    exit_time = datetime.now()
                    duration = exit_time - entry_dt
                    duration_hours = max(0.1, duration.total_seconds() / 3600.0)
                    
                    hourly_rate = RATE_CARD[target_spot["size"]]
                    total_cost = round(duration_hours * hourly_rate, 2)
                    
                    # EXECUTE CONCURRENT TRANSACTION MUTATION (Log Audit & Open Bay)
                    conn = get_db_connection()
                    
                    # 1. Store Ledger Entry
                    conn.execute("""
                        INSERT INTO transaction_history (timestamp, vehicle_id, spot_id, duration, amount_charged)
                        VALUES (?, ?, ?, ?, ?)
                    """, (exit_time.strftime("%Y-%m-%d %H:%M:%S"), target_spot["vehicle_assigned"], target_spot["id"], round(duration_hours, 2), total_cost))
                    
                    # 2. Free up physical grid row parameters
                    conn.execute("""
                        UPDATE parking_lot 
                        SET occupied = 0, vehicle_assigned = NULL, entry_time = NULL 
                        WHERE id = ?
                    """, (target_spot["id"],))
                    
                    conn.commit()
                    conn.close()
                    
                    st.balloons()
                    st.success(f"💸 **Receipt Processed for {target_spot['vehicle_assigned']}** \n\n* **Stay Duration:** {duration_hours:.2f} Hours \n* **Final Due Settled:** ${total_cost:.2f}")
                    st.rerun()
        else:
            st.info("ℹ️ No active vehicles currently parked to checkout.")
            
    with tab3:
        st.markdown("**Active Regulatory Tariff Pricing Structure**")
        rate_df = pd.DataFrame(list(RATE_CARD.items()), columns=["Vehicle Classification", "Standard Rate (Per Hour)"])
        rate_df["Standard Rate (Per Hour)"] = rate_df["Standard Rate (Per Hour)"].map(lambda x: f"${x:.2f}")
        st.table(rate_df)

with col_visuals:
    st.subheader("📊 Live Digital Twin Facility Layout")
    
    grid_cols = st.columns(4)
    for i, spot in enumerate(parking_lot_state):
        current_col = grid_cols[i % 4]
        with current_col:
            if spot["occupied"] == 1:
                entry_dt = datetime.strptime(spot["entry_time"], "%Y-%m-%d %H:%M:%S")
                time_in_lot = datetime.now() - entry_dt
                hrs = time_in_lot.total_seconds() / 3600.0
                st.error(f"**🔴 Slot {spot['id']}** \nSize: {spot['size']}  \n🚗 **{spot['vehicle_assigned']}** \n🕒 Time: {hrs:.1f}h")
            else:
                st.info(f"**🟢 Slot {spot['id']}** \nSize: {spot['size']}  \n📏 Dist: {spot['distance']}m  \n💵 ${RATE_CARD[spot['size']]:.1f}/h")
                
    st.markdown(" ")
    
    st.subheader("📜 Historical Audit Ledger")
    if transaction_history:
        history_df = pd.DataFrame(transaction_history)
        
        # Format display dataframe output visuals cleanly
        if not history_df.empty and "amount_charged" in history_df.columns:
            history_df["amount_charged"] = history_df["amount_charged"].map(lambda x: f"${x:.2f}")
            history_df.columns = ["Timestamp", "Vehicle ID", "Spot ID", "Duration (Hrs)", "Amount Charged"]
            
        st.dataframe(history_df, use_container_width=True, hide_index=True)
    else:
        st.info("No transaction logs recorded yet inside database files.")