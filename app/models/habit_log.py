from app import db
from datetime import date

class HabitLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    habit_id = db.Column(db.Integer, db.ForeignKey("habit.id"))
    log_date = db.Column(db.Date, default=date.today)
    status = db.Column(db.Boolean, default=False)
