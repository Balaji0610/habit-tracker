from flask import Blueprint, render_template, request, jsonify
from datetime import date, datetime
from calendar import monthrange
from app import db
from app.models.habit import Habit
from app.models.habit_log import HabitLog
from flask import redirect, url_for
from sqlalchemy.exc import SQLAlchemyError


dashboard_bp = Blueprint("dashboard", __name__)

@dashboard_bp.route("/")
def home():
    return redirect(url_for("dashboard.dashboard"))


@dashboard_bp.route("/dashboard")
def dashboard():
    try:
        habits = Habit.query.all()
        logs = HabitLog.query.all()

        # Get current month info
        today_date = date.today()
        current_year = today_date.year
        current_month = today_date.month
        current_day = today_date.day
        
        # Get number of days in current month
        days_in_month = monthrange(current_year, current_month)[1]

        # Create log map with proper date comparison
        log_map = {}
        log_map_json = {}  # JSON-serializable version
        
        for log in logs:
            if log.log_date.year == current_year and log.log_date.month == current_month:
                log_map[(log.habit_id, log.log_date.day)] = log.status
                # Create string key for JSON: "habitId_day"
                json_key = f"{log.habit_id}_{log.log_date.day}"
                log_map_json[json_key] = log.status

        # Completed today
        completed_today = sum(
            1 for h in habits if log_map.get((h.id, current_day), False)
        )

        # Monthly progress (up to today)
        total_done = sum(1 for (habit_id, day), status in log_map.items() if status and day <= current_day)
        total_possible = len(habits) * current_day if habits else 1

        progress = int((total_done / total_possible) * 100) if total_possible else 0
        
        # Today progress %
        today_done = sum(
            1 for h in habits if log_map.get((h.id, current_day), False)
        )

        today_progress = int((today_done / len(habits)) * 100) if habits else 0

        # Daily progress array for chart
        daily_progress = []
        for day in range(1, current_day + 1):
            done = sum(1 for h in habits if log_map.get((h.id, day), False))
            daily_progress.append(int((done / len(habits)) * 100) if habits else 0)

        # Serialize habits for JavaScript
        habits_json = [{"id": h.id, "name": h.name} for h in habits]

        return render_template(
            "dashboard.html",
            habits=habits,
            habits_json=habits_json,
            log_map=log_map,
            log_map_json=log_map_json,  # JSON-serializable version
            completed_today=completed_today,
            progress=progress,
            today_progress=today_progress,
            daily_progress=daily_progress,
            current_day=current_day,
            days_in_month=days_in_month,
            current_month=datetime.now().strftime("%B"),
            current_year=current_year
        )
    
    except Exception as e:
        print(f"Error in dashboard: {str(e)}")
        import traceback
        traceback.print_exc()
        return render_template("error.html", error="Failed to load dashboard"), 500


@dashboard_bp.route("/api/habit-log", methods=["POST"])
def save_habit_log():
    try:
        data = request.json
        
        # Validate input
        if not data or "habit_id" not in data or "day" not in data or "status" not in data:
            return jsonify({"success": False, "error": "Missing required fields"}), 400
        
        habit_id = int(data["habit_id"])
        day = int(data["day"])
        status = bool(data["status"])

        # Verify habit exists
        habit = Habit.query.get(habit_id)
        if not habit:
            return jsonify({"success": False, "error": "Habit not found"}), 404

        # Create log date
        today = date.today()
        log_date = date(today.year, today.month, day)

        # Check if log exists
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
        
        # Calculate updated stats
        current_day = today.day
        habits = Habit.query.all()
        logs = HabitLog.query.filter(
            db.extract('year', HabitLog.log_date) == today.year,
            db.extract('month', HabitLog.log_date) == today.month
        ).all()
        
        log_map = {(l.habit_id, l.log_date.day): l.status for l in logs}
        
        completed_today = sum(1 for h in habits if log_map.get((h.id, current_day), False))
        today_done = sum(1 for h in habits if log_map.get((h.id, current_day), False))
        today_progress = int((today_done / len(habits)) * 100) if habits else 0
        
        total_done = sum(1 for (hid, d), s in log_map.items() if s and d <= current_day)
        total_possible = len(habits) * current_day if habits else 1
        monthly_progress = int((total_done / total_possible) * 100) if total_possible else 0
        
        return jsonify({
            "success": True,
            "completed_today": completed_today,
            "today_progress": today_progress,
            "monthly_progress": monthly_progress
        })
    
    except ValueError as e:
        return jsonify({"success": False, "error": "Invalid data type"}), 400
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error: {str(e)}")
        return jsonify({"success": False, "error": "Database error"}), 500
    except Exception as e:
        print(f"Error saving habit log: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error"}), 500


@dashboard_bp.route("/api/habit", methods=["POST"])
def add_habit():
    """Add a new habit"""
    try:
        data = request.json
        
        # Validate input
        if not data or "name" not in data or not data["name"].strip():
            return jsonify({"success": False, "error": "Habit name is required"}), 400
        
        habit_name = data["name"].strip()
        
        # Check if habit already exists
        existing_habit = Habit.query.filter_by(name=habit_name).first()
        if existing_habit:
            return jsonify({"success": False, "error": "Habit already exists"}), 400
        
        # Create new habit
        new_habit = Habit(name=habit_name)
        db.session.add(new_habit)
        db.session.commit()
        
        return jsonify({
            "success": True,
            "habit": {
                "id": new_habit.id,
                "name": new_habit.name
            }
        })
    
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error: {str(e)}")
        return jsonify({"success": False, "error": "Database error"}), 500
    except Exception as e:
        print(f"Error adding habit: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error"}), 500


@dashboard_bp.route("/api/habit/<int:habit_id>", methods=["PUT"])
def edit_habit(habit_id):
    """Edit an existing habit"""
    try:
        data = request.json
        
        # Validate input
        if not data or "name" not in data or not data["name"].strip():
            return jsonify({"success": False, "error": "Habit name is required"}), 400
        
        habit_name = data["name"].strip()
        
        # Get habit
        habit = Habit.query.get(habit_id)
        if not habit:
            return jsonify({"success": False, "error": "Habit not found"}), 404
        
        # Check if new name conflicts with another habit
        existing_habit = Habit.query.filter(
            Habit.name == habit_name,
            Habit.id != habit_id
        ).first()
        if existing_habit:
            return jsonify({"success": False, "error": "Another habit with this name already exists"}), 400
        
        # Update habit
        habit.name = habit_name
        db.session.commit()
        
        return jsonify({
            "success": True,
            "habit": {
                "id": habit.id,
                "name": habit.name
            }
        })
    
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error: {str(e)}")
        return jsonify({"success": False, "error": "Database error"}), 500
    except Exception as e:
        print(f"Error editing habit: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error"}), 500


@dashboard_bp.route("/api/habit/<int:habit_id>", methods=["DELETE"])
def delete_habit(habit_id):
    """Delete a habit and all its logs"""
    try:
        # Get habit
        habit = Habit.query.get(habit_id)
        if not habit:
            return jsonify({"success": False, "error": "Habit not found"}), 404
        
        # Delete all logs for this habit
        HabitLog.query.filter_by(habit_id=habit_id).delete()
        
        # Delete habit
        db.session.delete(habit)
        db.session.commit()
        
        return jsonify({"success": True})
    
    except SQLAlchemyError as e:
        db.session.rollback()
        print(f"Database error: {str(e)}")
        return jsonify({"success": False, "error": "Database error"}), 500
    except Exception as e:
        print(f"Error deleting habit: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({"success": False, "error": "Server error"}), 500