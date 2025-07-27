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
            return "Empty" if prediction == 0 else "Occupied"
        
        # Buat prediksi untuk semua kombinasi dan filter hanya yang kosong
        empty_rooms = []
        all_predictions = []
        
        for room in rooms_list:
            for session_time in sessions_list:
                availability = predict_room_availability(room, session_time)
                all_predictions.append({
                    'Room': room,
                    'Session_Time': session_time,
                    'Status': availability
                })
                
                if availability == "Empty":
                    empty_rooms.append({
                        'Room': room,
                        'Session_Time': session_time,
                        'Status': 'Empty'
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
        required_rooms_cols = ['Name']
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

@app.route('/api/upload', methods=['POST'])
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

@app.route('/api/conflict/train', methods=['POST'])
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
        'service': 'Room Availability Predictor API',
        'version': '1.0.0',
        'endpoints': {
            'room_prediction': '/api/room/predict',
            'schedule_assignment': '/api/upload',
            'conflict_detection': '/api/conflict/train',
            'file_download': '/api/download/<filename>',
            'health_check': '/api/health'
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=8787)