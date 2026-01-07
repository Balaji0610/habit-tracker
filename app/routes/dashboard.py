from flask import Blueprint, render_template, request, jsonify
from datetime import date
from app import db
from app.models.habit import Habit
from app.models.habit_log import HabitLog

dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/dashboard")
def dashboard():
    habits = Habit.query.all()
    logs = HabitLog.query.all()

    log_map = {(l.habit_id, l.log_date.day): l.status for l in logs}

    today = date.today().day

    # ✅ Completed today
    completed_today = sum(
        1 for h in habits if log_map.get((h.id, today))
    )

    # ✅ Monthly progress
    total_done = sum(1 for v in log_map.values() if v)
    total_possible = len(habits) * today

    progress = int((total_done / total_possible) * 100) if total_possible else 0

    # ✅ Daily progress array for chart
    daily_progress = []
    for d in range(1, today + 1):
        done = sum(1 for h in habits if log_map.get((h.id, d)))
        daily_progress.append(int((done / len(habits)) * 100) if habits else 0)

    return render_template(
        "dashboard.html",
        habits=habits,
        log_map=log_map,
        completed_today=completed_today,
        progress=progress,
        daily_progress=daily_progress
    )


@dashboard_bp.route("/api/habit-log", methods=["POST"])
def save_habit_log():
    data = request.json
    print("RECEIVED:", data)  # 👈 ADD THIS
    habit_id = int(data["habit_id"])
    day = int(data["day"])
    status = bool(data["status"])

    log_date = date(date.today().year, date.today().month, day)


    log = HabitLog.query.filter_by(
        habit_id=habit_id,
        log_date=log_date
    ).first()

    if not log:
        log = HabitLog(
            habit_id=habit_id,
            log_date=log_date,
            status=status
        )
        db.session.add(log)
    else:
        log.status = status

    db.session.commit()
    return jsonify({"success": True})
