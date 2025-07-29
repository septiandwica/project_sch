from flask import Flask, request, jsonify, send_from_directory
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score
import joblib
import os
import random
from werkzeug.utils import secure_filename
from flask_cors import CORS
from datetime import datetime
import random
from collections import defaultdict

app = Flask(__name__)

# Enable CORS untuk API endpoints
CORS(app)

# Konfigurasi upload
UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'csv'}
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['ALLOWED_EXTENSIONS'] = ALLOWED_EXTENSIONS
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max file size

# Membuat folder upload jika belum ada
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def train_and_predict_room_availability(schedule_df, rooms_df):
    """Fungsi untuk melatih model dan memprediksi ketersediaan ruangan"""
    try:
        # Mengambil daftar nama ruangan dari rooms.csv
        rooms_list = rooms_df['Name'].unique()
        
        # Membuat daftar sesi dari schedule.csv
        sessions_list = schedule_df['Sched. Time'].unique()
        
        # Membuat kombinasi ruangan dan sesi untuk mendeteksi ruangan kosong
        data = []
        
        for room in rooms_list:
            for session_time in sessions_list:
                # Periksa apakah ruangan ada pada waktu sesi tertentu
                is_occupied = ((schedule_df['Room'] == room) & (schedule_df['Sched. Time'] == session_time)).any()
                data.append([room, session_time, is_occupied])
        
        # Convert to DataFrame
        features_df = pd.DataFrame(data, columns=['Room', 'Sched. Time', 'Is Occupied'])
        
        # Fitur (X) dan target (y)
        X = features_df[['Room', 'Sched. Time']]
        y = features_df['Is Occupied']
        
        # Mengubah kolom Room dan Sched. Time menjadi fitur numerik dengan pd.get_dummies
        X_encoded = pd.get_dummies(X, columns=['Room', 'Sched. Time'])
        
        # Split data menjadi data pelatihan dan data pengujian
        if len(X_encoded) > 1:
            X_train, X_test, y_train, y_test = train_test_split(X_encoded, y, test_size=0.2, random_state=42)
            
            # Inisialisasi dan latih model Random Forest
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_train, y_train)
            
            # Evaluasi akurasi model
            y_pred = model.predict(X_test)
            accuracy = accuracy_score(y_test, y_pred)
        else:
            # Jika data terlalu sedikit, latih dengan semua data
            model = RandomForestClassifier(n_estimators=100, random_state=42)
            model.fit(X_encoded, y)
            accuracy = 1.0
        
        # Fungsi untuk memprediksi ketersediaan ruangan
        def predict_room_availability(room, session_time):
            input_data = pd.DataFrame([[room, session_time]], columns=['Room', 'Sched. Time'])
            input_encoded = pd.get_dummies(input_data, columns=['Room', 'Sched. Time'])
            
            # Menambah kolom yang hilang untuk mencocokkan dengan fitur pelatihan
            missing_cols = set(X_encoded.columns) - set(input_encoded.columns)
            for col in missing_cols:
                input_encoded[col] = 0
            
            # Urutkan kolom pada input_data agar sesuai dengan urutan kolom pelatihan
            input_encoded = input_encoded[X_encoded.columns]
            
            prediction = model.predict(input_encoded)
            return "Available" if prediction == 0 else "Occupied"
        
        # Buat prediksi untuk semua kombinasi dan filter hanya yang kosong
        empty_rooms = []
        all_predictions = []
        
        for room in rooms_list:
            for session_time in sessions_list:
                availability = predict_room_availability(room, session_time)
                all_predictions.append({
                    'Room': room,
                    'Session_Time': session_time,
                    'Status': availability,
                    'Notes': rooms_df.loc[rooms_df['Name'] == room, 'Notes'].values[0]  # Menambahkan Notes ke prediksi
                })
                
                if availability == "Available":
                    empty_rooms.append({
                        'Room': room,
                        'Session_Time': session_time,
                        'Status': 'Available',
                        'Notes': rooms_df.loc[rooms_df['Name'] == room, 'Notes'].values[0]  # Menambahkan Notes ke ruang kosong
                    })
        
        return {
            'accuracy': accuracy,
            'empty_rooms': empty_rooms,
            'all_predictions': all_predictions,
            'total_rooms': len(rooms_list),
            'total_sessions': len(sessions_list),
            'total_empty_slots': len(empty_rooms)
        }
        
    except Exception as e:
        raise Exception(f"Error in room availability prediction: {str(e)}")
def assign_room_for_major(major, rooms_by_major):
    """Fungsi untuk assign room berdasarkan major"""
    available_rooms = rooms_by_major.get(major, [])
    if not available_rooms:
        available_rooms = rooms_by_major.get('general', [])
    if available_rooms:
        random.shuffle(available_rooms)
        return available_rooms[0]
    return None

# ==================== NEW SIMPLIFIED ENDPOINT ====================

@app.route('/api/room/predict', methods=['POST'])
def predict_room_availability_endpoint():
    """API endpoint untuk prediksi ruangan kosong - SIMPLIFIED"""
    
    # Validasi file upload
    if 'rooms_file' not in request.files or 'schedule_file' not in request.files:
        return jsonify({
            'error': 'Missing required files',
            'required_files': ['rooms_file', 'schedule_file']
        }), 400

    rooms_file = request.files['rooms_file']
    schedule_file = request.files['schedule_file']

    if rooms_file.filename == '' or schedule_file.filename == '':
        return jsonify({'error': 'No files selected'}), 400

    if not (rooms_file and allowed_file(rooms_file.filename) and 
            schedule_file and allowed_file(schedule_file.filename)):
        return jsonify({'error': 'Invalid file format. Only CSV files are allowed.'}), 400

    try:
        # Baca file CSV langsung dari memory
        rooms_df = pd.read_csv(rooms_file)
        schedule_df = pd.read_csv(schedule_file)
        
        # Validasi kolom yang diperlukan
        required_rooms_cols = ['Name', 'Notes']
        required_schedule_cols = ['Room', 'Sched. Time']
        
        if not all(col in rooms_df.columns for col in required_rooms_cols):
            return jsonify({
                'error': 'Invalid rooms file format',
                'required_columns': required_rooms_cols,
                'found_columns': list(rooms_df.columns)
            }), 400
        
        if not all(col in schedule_df.columns for col in required_schedule_cols):
            return jsonify({
                'error': 'Invalid schedule file format',
                'required_columns': required_schedule_cols,
                'found_columns': list(schedule_df.columns)
            }), 400
        
        # Proses prediksi
        result = train_and_predict_room_availability(schedule_df, rooms_df)
        
        # Simpan hasil ke CSV (opsional)
        empty_rooms_df = pd.DataFrame(result['empty_rooms'])
        if not empty_rooms_df.empty:
            csv_filename = 'empty_rooms_predictions.csv'
            csv_path = os.path.join(app.config['UPLOAD_FOLDER'], csv_filename)
            empty_rooms_df.to_csv(csv_path, index=False)
        
        # Return hasil dalam format JSON
        return jsonify({
            'success': True,
            'message': 'Room availability prediction completed successfully',
            'model_accuracy': round(result['accuracy'], 4),
            'statistics': {
                'total_rooms': result['total_rooms'],
                'total_sessions': result['total_sessions'],
                'total_combinations': result['total_rooms'] * result['total_sessions'],
                'total_empty_slots': result['total_empty_slots'],
                'empty_percentage': round((result['total_empty_slots'] / (result['total_rooms'] * result['total_sessions'])) * 100, 2)
            },
            'empty_rooms': result['empty_rooms'],
            'csv_generated': not empty_rooms_df.empty if 'empty_rooms_df' in locals() else False
        })
        
    except pd.errors.EmptyDataError:
        return jsonify({'error': 'One or more uploaded files are empty'}), 400
    except pd.errors.ParserError as e:
        return jsonify({'error': f'Error parsing CSV file: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Processing error: {str(e)}'}), 500

# ==================== ORIGINAL ENDPOINTS ====================

@app.route('/api/schedule/optimize', methods=['POST'])
def upload_file():
    """Original endpoint untuk upload dan proses file schedule assignment"""
    if 'rooms_file' not in request.files or 'sched_file' not in request.files or 'data_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    rooms_file = request.files['rooms_file']
    sched_file = request.files['sched_file']
    data_file = request.files['data_file']

    if rooms_file.filename == '' or sched_file.filename == '' or data_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if rooms_file and allowed_file(rooms_file.filename) and sched_file and allowed_file(sched_file.filename) and data_file and allowed_file(data_file.filename):
        try:
            # Secure the filenames before saving
            rooms_filename = secure_filename(rooms_file.filename)
            sched_filename = secure_filename(sched_file.filename)
            data_filename = secure_filename(data_file.filename)

            rooms_file.save(os.path.join(app.config['UPLOAD_FOLDER'], rooms_filename))
            sched_file.save(os.path.join(app.config['UPLOAD_FOLDER'], sched_filename))
            data_file.save(os.path.join(app.config['UPLOAD_FOLDER'], data_filename))

            # Process the files using the existing logic
            rooms_df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], rooms_filename))
            sched_df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], sched_filename))
            data_raw_df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], data_filename))

            # Your existing logic for processing data (unchanged)
            data_df = data_raw_df.sort_values(by="Major", ascending=True)
            rooms_list = rooms_df[['Name', 'Notes']].values.tolist()
            rooms_by_major = {}
            for room, note in rooms_list:
                notes = note.split(', ') if pd.notna(note) else ['general']
                for n in notes:
                    if n not in rooms_by_major:
                        rooms_by_major[n] = []
                    rooms_by_major[n].append(room)

            sched_df['Sched. Time'] = sched_df['Day'] + sched_df['Session'].astype(str)
            sessions_list = sched_df['Sched. Time'].tolist()
            room_session_pairs = set()

            assigned_rooms = []
            assigned_sessions = []

            for _, row in data_df.iterrows():
                major = row['Major']
                room = assign_room_for_major(major, rooms_by_major)
                session_time = random.choice(sessions_list)
                room_session_pair = (room, session_time)
                while room_session_pair in room_session_pairs:
                    session_time = random.choice(sessions_list)
                    room_session_pair = (room, session_time)
                room_session_pairs.add(room_session_pair)
                assigned_rooms.append(room)
                assigned_sessions.append(session_time)

            data_df['Room'] = assigned_rooms
            data_df['Sched. Time'] = assigned_sessions

            # Save the updated dataframe with a new filename based on the data file's name
            updated_filename = f"updated_{data_filename}"
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], updated_filename)
            data_df.to_csv(file_path, index=False)

            print(f"File saved at: {file_path}")  # Print the file path for debugging

            return jsonify({'message': 'Files processed successfully', 'file': updated_filename})

        except Exception as e:
            return jsonify({'error': f'Error processing files: {str(e)}'}), 500

    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/api/conflict/predict', methods=['POST'])
def train_model():
    """Original endpoint untuk train model conflict detection"""
    if 'train_file' not in request.files:
        return jsonify({'error': 'No file part'}), 400

    train_file = request.files['train_file']

    if train_file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    if train_file and allowed_file(train_file.filename):
        try:
            # Save the uploaded file
            train_filename = secure_filename(train_file.filename)
            train_file.save(os.path.join(app.config['UPLOAD_FOLDER'], train_filename))

            # Read the file and process it
            updated_df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], train_filename))

            # Ensure all columns are kept, and add 'Conflict' column
            updated_df['Conflict'] = updated_df.duplicated(subset=['Room', 'Sched. Time'], keep=False).astype(int)

            # Save the updated DataFrame with all columns and the 'Conflict' column
            conflict_filename = 'conflict_results.csv'
            updated_df.to_csv(os.path.join(app.config['UPLOAD_FOLDER'], conflict_filename), index=False)

            # Train the model (optional, you can skip this if you just want the results)
            X = updated_df[['Room', 'Sched. Time']]
            y = updated_df['Conflict']

            X = pd.get_dummies(X, columns=['Room', 'Sched. Time'])

            if len(X) > 1:
                X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

                # Train RandomForest model
                model = RandomForestClassifier(n_estimators=100, random_state=42)
                model.fit(X_train, y_train)

                # Evaluate accuracy
                y_pred = model.predict(X_test)
                accuracy = accuracy_score(y_test, y_pred)
            else:
                model = RandomForestClassifier(n_estimators=100, random_state=42)
                model.fit(X, y)
                accuracy = 1.0

            print(f"Model accuracy: {accuracy:.2f}")

            # Save the trained model to disk
            model_filename = 'schedule_conflict_model.pkl'
            joblib.dump(model, os.path.join(app.config['UPLOAD_FOLDER'], model_filename))

            return jsonify({'message': 'Model trained successfully', 'accuracy': accuracy, 'model_file': model_filename, 'conflict_file': conflict_filename})

        except Exception as e:
            return jsonify({'error': f'Error training model: {str(e)}'}), 500

    return jsonify({'error': 'Invalid file format'}), 400

@app.route('/api/conflict/resolve', methods=['POST'])
def resolve_conflict():
    try:
        # Memeriksa apakah file jadwal dan file ruang tersedia dalam request
        if 'schedule_file' not in request.files or 'room_file' not in request.files:
            return jsonify({'error': 'Schedule file or Room file not provided'}), 400

        schedule_file = request.files['schedule_file']
        room_file = request.files['room_file']

        # Memeriksa apakah file yang di-upload memiliki nama
        if schedule_file.filename == '' or room_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Memeriksa apakah file memiliki format yang valid
        if schedule_file and allowed_file(schedule_file.filename) and room_file and allowed_file(room_file.filename):
            # Menyimpan file yang di-upload
            schedule_filename = secure_filename(schedule_file.filename)
            room_filename = secure_filename(room_file.filename)
            schedule_file.save(os.path.join(app.config['UPLOAD_FOLDER'], schedule_filename))
            room_file.save(os.path.join(app.config['UPLOAD_FOLDER'], room_filename))

            # Membaca file jadwal dan file ruang
            schedule_df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], schedule_filename))
            room_df = pd.read_csv(os.path.join(app.config['UPLOAD_FOLDER'], room_filename))

            # Clean up column names by stripping any whitespace
            schedule_df.columns = schedule_df.columns.str.strip()  # Strip spaces from column names
            room_df.columns = room_df.columns.str.strip()  # Strip spaces from column names

            # Periksa apakah kolom 'Conflict' ada
            if 'Conflict' not in schedule_df.columns:
                return jsonify({'error': "Column 'Conflict' is missing from the schedule file."}), 400

            # Menyaring hanya ruangan dengan Notes == 'general'
            available_rooms = room_df[room_df['Notes'] == 'general']

            # Resolving conflicts
            conflicts = []  # Initialize conflicts list
            conflict_count = 0  # Variabel untuk menghitung jumlah konflik yang berhasil diselesaikan
            used_rooms = set()  # Set untuk melacak ruang yang sudah digunakan

            for index, conflict in schedule_df[schedule_df['Conflict'] == 1.0].iterrows():
                # Temukan ruang yang bertabrakan
                conflicting_room = conflict['Room']
                conflicting_time = conflict['Sched. Time']
                major = conflict['Major']  # Ambil major dari jadwal yang bermasalah

                # Langkah 1: Cek apakah ada ruang kosong yang lain di waktu yang sama dengan Notes "general"
                available_room_at_same_time = available_rooms[
                    (available_rooms['Session_Time'] == conflicting_time) & 
                    (available_rooms['Status'] == 'Available') &
                    (~available_rooms['Room'].isin(used_rooms))  # Hanya pilih ruang yang belum digunakan
                ]

                if not available_room_at_same_time.empty:
                    # Jika ada ruang kosong di waktu yang sama, pindahkan jadwal ke ruang kosong tersebut
                    new_room = available_room_at_same_time.iloc[0]['Room']
                    schedule_df.at[index, 'Room'] = new_room

                    # Tandai ruang yang digunakan sebagai "Occupied"
                    room_df.at[room_df[room_df['Room'] == new_room].index[0], 'Status'] = 'Occupied'
                    used_rooms.add(new_room)  # Menambahkan ruang yang dipakai ke set
                    room_df.to_csv(os.path.join(app.config['UPLOAD_FOLDER'], room_filename), index=False)
                    conflicts.append({
                        'Room': new_room,
                        'Sched. Time': conflicting_time,
                        'Subject': conflict['Subject'],
                        'Lecturer': conflict['Lecturer'],
                    })
                    conflict_count += 1  # Konflik berhasil diselesaikan
                else:
                    # Langkah 2: Jika tidak ada ruang kosong di waktu yang sama, coba cari waktu kosong untuk ruang yang sama
                    available_time_for_same_room = available_rooms[
                        (available_rooms['Room'] == conflicting_room) &
                        (available_rooms['Status'] == 'Empty') &
                        (~available_rooms['Room'].isin(used_rooms))  # Hanya pilih ruang yang belum digunakan
                    ]

                    if not available_time_for_same_room.empty:
                        # Pindahkan jadwal ke waktu kosong yang tersedia untuk ruang yang sama
                        new_time = available_time_for_same_room.iloc[0]['Session_Time']
                        schedule_df.at[index, 'Sched. Time'] = new_time
                        used_rooms.add(conflicting_room)  # Menandai ruang yang sama telah digunakan
                        conflicts.append({
                            'Room': conflicting_room,
                            'Sched. Time': new_time,
                            'Subject': conflict['Subject'],
                            'Lecturer': conflict['Lecturer'],
                        })
                        conflict_count += 1  # Konflik berhasil diselesaikan

                    else:
                        # Langkah 3: Jika tidak ada ruang dan waktu kosong di ruang yang sama, kita cari ruang kosong di waktu yang berbeda
                        available_room_at_different_time = available_rooms[
                            (available_rooms['Status'] == 'Available') &
                            (~available_rooms['Room'].isin(used_rooms))  # Hanya pilih ruang yang belum digunakan
                        ]

                        if not available_room_at_different_time.empty:
                            # Pindahkan ke ruang yang kosong di waktu lain
                            new_room = available_room_at_different_time.iloc[0]['Room']
                            new_time = available_room_at_different_time.iloc[0]['Session_Time']
                            schedule_df.at[index, 'Room'] = new_room
                            schedule_df.at[index, 'Sched. Time'] = new_time

                            # Tandai ruang yang digunakan sebagai "Occupied"
                            room_df.at[room_df[room_df['Room'] == new_room].index[0], 'Status'] = 'Occupied'
                            used_rooms.add(new_room)  # Menambahkan ruang yang dipakai ke set
                            room_df.to_csv(os.path.join(app.config['UPLOAD_FOLDER'], room_filename), index=False)
                            conflicts.append({
                                'Room': new_room,
                                'Sched. Time': new_time,
                                'Subject': conflict['Subject'],
                                'Lecturer': conflict['Lecturer'],
                            })
                            conflict_count += 1  # Konflik berhasil diselesaikan

            # Menghapus kolom 'Conflict' setelah penyelesaian
            schedule_df = schedule_df.drop(columns=['Conflict'])

            # Menyimpan jadwal yang telah diperbaiki
            fixed_schedule_filename = 'fixed_schedule.csv'
            schedule_df.to_csv(os.path.join(app.config['UPLOAD_FOLDER'], fixed_schedule_filename), index=False)

            # Mengembalikan respons JSON yang mencakup jumlah konflik yang berhasil diselesaikan
            return jsonify({
                'message': f'{conflict_count} conflicts resolved successfully',
                'resolved_schedule': fixed_schedule_filename,
                'conflicts': conflicts,  # Ensure this contains data
            })

        return jsonify({'error': 'Invalid file format'}), 400

    except Exception as e:
        return jsonify({'error': f'Error resolving conflicts: {str(e)}'}), 500

def extract_day_from_schedule(schedule_time):
    """Extract day from schedule time format like 'Wed14:30-17:15'"""
    try:
        if pd.isna(schedule_time) or schedule_time == '':
            return None
        
        # Extract day part (first 3 characters)
        day = schedule_time[:3]
        return day
    except:
        return None

def calculate_credits_per_day(schedule_df, lecturer_name):
    """Calculate total credits per day for a lecturer"""
    lecturer_schedule = schedule_df[schedule_df['Lecturer'] == lecturer_name].copy()
    
    if lecturer_schedule.empty:
        return {}
    
    # Extract day from schedule time
    lecturer_schedule['Day'] = lecturer_schedule['Sched. Time'].apply(extract_day_from_schedule)
    
    # Group by day and sum credits
    credits_per_day = lecturer_schedule.groupby('Day')['Cr'].sum().to_dict()
    
    return credits_per_day

def check_lecturer_availability(lecturer_name, new_day, new_credits, lecturer_df, schedule_df):
    """Check if a lecturer's availability based on their 'Notes' field with flexible pattern matching"""
    
    # Get the Notes value for the lecturer
    lecturer_notes = lecturer_df[lecturer_df['Lecturer Name'] == lecturer_name]['Notes'].values[0]
    
    # Get the Room and Session restrictions
    if isinstance(lecturer_notes, str):
        notes = lecturer_notes.split(',')
        
        # General check for day restrictions like 'No Mon', 'No Tue', etc.
        for note in notes:
            # Check for day restriction 'No {day}'
            if f'No {new_day}' in note:
                return False, f"Lecturer is not available on {new_day}"
            
            # Check for day range like 'Mon-Wed', 'Tue-Fri', etc.
            if '-' in note:
                days = note.split('-')
                # Check if the new_day is within the range of days
                days_in_range = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
                start_idx = days_in_range.index(days[0])
                end_idx = days_in_range.index(days[1])
                
                if not (start_idx <= days_in_range.index(new_day) <= end_idx):
                    return False, f"Lecturer can only be assigned between {days[0]} and {days[1]}"
            
            # Check for session-related restrictions (e.g., 'No Session1', 'Session2-Session4')
            if 'Session' in note:
                if '-' in note:
                    session_range = note.split('-')
                    session_start = int(session_range[0].replace('Session', ''))
                    session_end = int(session_range[1].replace('Session', ''))
                    # Extract the session number (e.g., Mon1, Tue3, etc.)
                    session_number = int(new_credits.replace(f'{new_day}', '').replace('Session', ''))  # e.g. 'Mon1' -> 1
                    
                    # Check if the session is in the restricted range
                    if session_start <= session_number <= session_end:
                        return False, f"Lecturer cannot be assigned to Session {session_number} on {new_day}"
                elif f"Session{new_credits}" in note:
                    return False, f"Lecturer cannot be assigned to {new_credits} on {new_day}"

    return True, "OK"


def can_assign_lecturer(schedule_df, lecturer_name, lecturer_type, new_day, new_credits, lecturer_df):
    """Check if lecturer can be assigned based on constraints, including no consecutive classes"""
    
    # Check the lecturer's availability based on Notes
    can_assign, reason = check_lecturer_availability(lecturer_name, new_day, new_credits, lecturer_df, schedule_df)
    if not can_assign:
        return False, reason
    
    # Existing checks (daily credit limit, weekly working days limit, consecutive classes)
    current_credits_per_day = calculate_credits_per_day(schedule_df, lecturer_name)
    
    # Get current credits for the new day
    current_day_credits = current_credits_per_day.get(new_day, 0)
    
    # Check daily credit limit
    max_daily_credits = 12 if lecturer_type == 'Full' else 6
    if current_day_credits + new_credits > max_daily_credits:
        return False, f"Daily credit limit exceeded ({current_day_credits + new_credits} > {max_daily_credits})"
    
    # Check weekly working days limit
    working_days = len([day for day, credits in current_credits_per_day.items() if credits > 0])
    if new_day not in current_credits_per_day:
        working_days += 1
    
    max_working_days = 5 if lecturer_type == 'Full' else 2
    if working_days > max_working_days:
        return False, f"Working days limit exceeded ({working_days} > {max_working_days})"
    
    # Check for consecutive classes on the same day
    existing_schedule = schedule_df[schedule_df['Lecturer'] == lecturer_name]
    existing_times = existing_schedule[existing_schedule['Sched. Time'].str.startswith(new_day)]['Sched. Time']
    
    # Initialize a list to store hours of existing classes
    existing_hours = []
    
    for time in existing_times:
        # Ensure time is a string before applying split()
        if isinstance(time, str):  # Check if the value is a string
            try:
                # Extract the part after the day abbreviation (e.g., "Thu1" -> "1")
                hour_part = time[len(new_day):]  # Get the part after 'Thu', 'Mon', etc.
                
                # If hour_part is non-empty, convert it to an integer (representing the class hour)
                if hour_part:
                    hour = int(hour_part)
                    existing_hours.append(hour)
            except ValueError:
                # Handle cases where the hour part can't be converted to an integer
                continue
    
    # Check if the new class conflicts with existing classes (i.e., if they are consecutive)
    try:
        new_class_hour = int(str(new_credits).split(":")[1])  # Assuming new_credits contains time info in HH:MM format
    except (IndexError, ValueError):
        new_class_hour = None  # Handle cases where `new_credits` is not in the expected format

    # If we couldn't extract the class hour from new_credits, skip the consecutive check
    if new_class_hour is not None:
        for hour in existing_hours:
            if abs(new_class_hour - hour) == 1:  # Check if there are classes consecutively in time
                return False, f"Cannot assign consecutive classes on the same day"
    
    return True, "OK"
def assign_lecturers_to_schedule(schedule_df, lecturer_df):
    """Main function to assign lecturers to schedule"""
    try:
        # Create a copy of schedule dataframe
        result_df = schedule_df.copy()
        result_df['Lecturer'] = None
        
        # Create lecturer pools
        full_lecturers = lecturer_df[lecturer_df['Lec. Type'] == 'Full']['Lecturer Name'].tolist()
        part_lecturers = lecturer_df[lecturer_df['Lec. Type'] == 'Part']['Lecturer Name'].tolist()
        
        # Create lecturer type mapping
        lecturer_type_map = dict(zip(lecturer_df['Lecturer Name'], lecturer_df['Lec. Type']))
        
        # Statistics tracking
        assignment_stats = {
            'total_subjects': len(result_df),
            'assigned': 0,
            'unassigned': 0,
            'lecturer_workload': defaultdict(lambda: {'days': set(), 'total_credits': 0, 'subjects': 0})
        }
        
        # Sort schedule by credits (descending) to assign high-credit subjects first
        sorted_indices = result_df.sort_values('Cr', ascending=False).index
        
        for idx in sorted_indices:
            row = result_df.loc[idx]
            subject_credits = row['Cr']
            schedule_time = row['Sched. Time']
            
            # Extract day from schedule
            day = extract_day_from_schedule(schedule_time)
            if not day:
                continue
            
            # Try to assign lecturer
            assigned = False
            
            # First try full-time lecturers (they have more capacity)
            lecturers_to_try = full_lecturers + part_lecturers
            random.shuffle(lecturers_to_try)  # Randomize for fair distribution
            
            for lecturer in lecturers_to_try:
                lecturer_type = lecturer_type_map[lecturer]
                
                can_assign, reason = can_assign_lecturer(result_df, lecturer, lecturer_type, day, subject_credits, lecturer_df)
                
                if can_assign:
                    result_df.loc[idx, 'Lecturer'] = lecturer
                    
                    # Update statistics
                    assignment_stats['assigned'] += 1
                    assignment_stats['lecturer_workload'][lecturer]['days'].add(day)
                    assignment_stats['lecturer_workload'][lecturer]['total_credits'] += subject_credits
                    assignment_stats['lecturer_workload'][lecturer]['subjects'] += 1
                    
                    assigned = True
                    break
            
            if not assigned:
                assignment_stats['unassigned'] += 1
        
        # Prepare final statistics
        assignment_stats['lecturer_summary'] = {}
        for lecturer, workload in assignment_stats['lecturer_workload'].items():
            lecturer_type = lecturer_type_map[lecturer]
            assignment_stats['lecturer_summary'][lecturer] = {
                'type': lecturer_type,
                'working_days': len(workload['days']),
                'total_credits': workload['total_credits'],
                'total_subjects': workload['subjects'],
                'days_list': list(workload['days'])
            }
        
        return result_df, assignment_stats
        
    except Exception as e:
        raise Exception(f"Error in lecturer assignment: {str(e)}")

# New Flask endpoint
@app.route('/api/schedule/lecturer', methods=['POST'])
def assign_lecturers_endpoint():
    """API endpoint untuk mengalokasikan dosen ke jadwal"""
    
    # Validasi file upload
    if 'schedule_file' not in request.files or 'lecturer_file' not in request.files:
        return jsonify({
            'error': 'Missing required files',
            'required_files': ['schedule_file', 'lecturer_file']
        }), 400
    
    schedule_file = request.files['schedule_file']
    lecturer_file = request.files['lecturer_file']
    
    if schedule_file.filename == '' or lecturer_file.filename == '':
        return jsonify({'error': 'No files selected'}), 400
    
    if not (schedule_file and allowed_file(schedule_file.filename) and 
            lecturer_file and allowed_file(lecturer_file.filename)):
        return jsonify({'error': 'Invalid file format. Only CSV files are allowed.'}), 400
    
    try:
        # Baca file CSV langsung dari memory
        schedule_df = pd.read_csv(schedule_file)
        lecturer_df = pd.read_csv(lecturer_file)
        
        # Validasi kolom yang diperlukan
        required_schedule_cols = ['Program Session', 'Major', 'Curriculum', 'Class', 'Subject', 'Cr', 'Room', 'Sched. Time']
        required_lecturer_cols = ['Lecturer Name', 'Lec. Type']
        
        if not all(col in schedule_df.columns for col in required_schedule_cols):
            return jsonify({
                'error': 'Invalid schedule file format',
                'required_columns': required_schedule_cols,
                'found_columns': list(schedule_df.columns)
            }), 400
        
        if not all(col in lecturer_df.columns for col in required_lecturer_cols):
            return jsonify({
                'error': 'Invalid lecturer file format',
                'required_columns': required_lecturer_cols,
                'found_columns': list(lecturer_df.columns)
            }), 400
        
        # Filter dan drop lecturer dengan Lec. Type None atau NaN
        initial_lecturer_count = len(lecturer_df)
        lecturer_df = lecturer_df.dropna(subset=['Lec. Type'])  # Drop NaN values
        lecturer_df = lecturer_df[lecturer_df['Lec. Type'] != 'None']  # Drop 'None' values
        
        # Validasi tipe dosen yang tersisa
        valid_lecturer_types = ['Full', 'Part']
        lecturer_df = lecturer_df[lecturer_df['Lec. Type'].isin(valid_lecturer_types)]
        
        filtered_lecturer_count = len(lecturer_df)
        dropped_count = initial_lecturer_count - filtered_lecturer_count
        
        if lecturer_df.empty:
            return jsonify({
                'error': 'No valid lecturers found after filtering',
                'message': f'All {initial_lecturer_count} lecturers were dropped due to invalid Lec. Type',
                'valid_types': valid_lecturer_types
            }), 400
        
        # Proses assignment
        result_df, stats = assign_lecturers_to_schedule(schedule_df, lecturer_df)
        
        # Simpan hasil ke CSV (hanya kolom asli + Lecturer)
        output_filename = 'schedule_with_lecturers.csv'
        csv_path = os.path.join(app.config['UPLOAD_FOLDER'], output_filename)
        result_df.to_csv(csv_path, index=False)
        
        # Hitung statistik tambahan
        assignment_rate = (stats['assigned'] / stats['total_subjects']) * 100 if stats['total_subjects'] > 0 else 0
        
        # Return hasil dalam format JSON
        return jsonify({
            'success': True,
            'message': 'Lecturer assignment completed successfully',
            'filtering_info': {
                'initial_lecturers': initial_lecturer_count,
                'valid_lecturers': filtered_lecturer_count,
                'dropped_lecturers': dropped_count,
                'drop_reason': 'Lec. Type None, NaN, or invalid values'
            },
            'statistics': {
                'total_subjects': stats['total_subjects'],
                'assigned_subjects': stats['assigned'],
                'unassigned_subjects': stats['unassigned'],
                'assignment_rate': round(assignment_rate, 2),
                'total_valid_lecturers': len(lecturer_df),
                'active_lecturers': len(stats['lecturer_summary'])
            },
            'lecturer_workload': stats['lecturer_summary'],
            'unassigned_subjects': result_df[result_df['Lecturer'].isna()][
                ['Subject', 'Class', 'Cr', 'Sched. Time']
            ].to_dict('records'),
            'csv_filename': output_filename,
            'constraints_applied': {
                'Full-time lecturers': 'Max 5 working days, Max 12 credits per day',
                'Part-time lecturers': 'Max 2 working days, Max 6 credits per day'
            }
        })
        
    except pd.errors.EmptyDataError:
        return jsonify({'error': 'One or more uploaded files are empty'}), 400
    except pd.errors.ParserError as e:
        return jsonify({'error': f'Error parsing CSV file: {str(e)}'}), 400
    except Exception as e:
        return jsonify({'error': f'Processing error: {str(e)}'}), 500
@app.route('/api/download/<filename>')
def download_file(filename):
    """Original endpoint untuk download file"""
    try:
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename, as_attachment=True)
    except FileNotFoundError:
        return jsonify({'error': 'File not found'}), 404

# ==================== UTILITY ENDPOINTS ====================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'API Scheduling Optimization',
        'version': '1.0.0',
        'description': 'Python Flask API for scheduling optimization',
        'endpoints': {
            'room_prediction': '/api/room/predict',
            'schedule_assignment': '/api/schedule/optimize',
            'conflict_detection': '/api/conflict/predict',
            'lecturer_assignment': '/api/schedule/lecturer',
            'conflict_resolution': '/api/conflict/resolve',
            'file_download': '/api/download/<filename>',
            'health_check': '/api/health'
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=8787)