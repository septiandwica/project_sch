from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Model untuk tabel schedule
class Schedule(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    program_session = db.Column(db.String(100))
    major = db.Column(db.String(100))
    curriculum = db.Column(db.String(100))
    class_name = db.Column(db.String(100))
    subject = db.Column(db.String(100))
    credit = db.Column(db.Float)
    room = db.Column(db.String(100))
    sched_time = db.Column(db.String(100))
    lecturer = db.Column(db.String(100))  # Nama pengajar

# Model untuk tabel user (lecturer)
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True)
    password = db.Column(db.String(100))
