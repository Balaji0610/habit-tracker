document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     DARK MODE
     ===================== */
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const htmlElement = document.documentElement;

  // Load saved theme
  const savedTheme = localStorage.getItem('theme') || 'light';
  htmlElement.setAttribute('data-theme', savedTheme);
  updateThemeIcon(savedTheme);

  themeToggle.addEventListener('click', () => {
    const currentTheme = htmlElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    htmlElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
    
    // Update chart colors for dark mode
    updateChartColors(newTheme);
  });

  function updateThemeIcon(theme) {
    if (theme === 'dark') {
      themeIcon.className = 'bi bi-sun-fill';
    } else {
      themeIcon.className = 'bi bi-moon-fill';
    }
  }

  function updateChartColors(theme) {
    const isDark = theme === 'dark';
    const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
    const textColor = isDark ? '#e8eaed' : '#212529';

    if (window.areaChart) {
      window.areaChart.options.scales.x.ticks.color = textColor;
      window.areaChart.options.scales.y.ticks.color = textColor;
      window.areaChart.options.scales.y.grid.color = gridColor;
      window.areaChart.update('none');
    }

    if (window.barChart) {
      window.barChart.options.scales.x.ticks.color = textColor;
      window.barChart.options.scales.y.ticks.color = textColor;
      window.barChart.options.scales.x.grid.color = gridColor;
      window.barChart.update('none');
    }

    if (window.circleChart) {
      window.circleChart.options.plugins.legend.labels.color = textColor;
      window.circleChart.update('none');
    }
  }

  /* =====================
     TOAST
     ===================== */
  const toastEl = document.getElementById('saveToast');
  const toast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: 2000
  });

  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    
    toastEl.classList.remove('bg-success', 'bg-danger', 'text-white');
    if (isSuccess) {
      toastEl.classList.add('bg-success', 'text-white');
    } else {
      toastEl.classList.add('bg-danger', 'text-white');
    }
    
    toast.show();
  }

  /* =====================
     UPDATE STATS
     ===================== */
  function updateStats(data) {
    if (data.completed_today !== undefined) {
      document.getElementById('completed-today').textContent = data.completed_today;
    }
    if (data.today_progress !== undefined) {
      document.getElementById('today-progress').textContent = data.today_progress + '%';
    }
  }

  /* =====================
     RECALCULATE PROGRESS
     ===================== */
  function recalculateProgress() {
    const checkboxes = document.querySelectorAll('.habit-checkbox-wire');
    const habitsByDay = {};
    
    checkboxes.forEach(cb => {
      const day = parseInt(cb.dataset.day);
      if (!habitsByDay[day]) {
        habitsByDay[day] = [];
      }
      habitsByDay[day].push(cb.checked);
    });
    
    const newDailyProgress = [];
    for (let day = 1; day <= CURRENT_DAY; day++) {
      if (habitsByDay[day]) {
        const completed = habitsByDay[day].filter(c => c).length;
        const total = habitsByDay[day].length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        newDailyProgress.push(percentage);
      } else {
        newDailyProgress.push(0);
      }
    }
    
    if (habitsByDay[CURRENT_DAY]) {
      const todayCompleted = habitsByDay[CURRENT_DAY].filter(c => c).length;
      const todayTotal = habitsByDay[CURRENT_DAY].length;
      const todayPercentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;
      
      document.getElementById('completed-today').textContent = todayCompleted;
      document.getElementById('today-progress').textContent = todayPercentage + '%';
      
      if (window.circleChart) {
        window.circleChart.data.datasets[0].data = [todayPercentage, 100 - todayPercentage];
        window.circleChart.update('none');
      }
    }
    
    if (window.areaChart) {
      window.areaChart.data.labels = newDailyProgress.map((_, i) => i + 1);
      window.areaChart.data.datasets[0].data = newDailyProgress;
      window.areaChart.update('none');
    }
    
    if (window.barChart && HABITS) {
      const habitProgress = HABITS.map(habit => {
        const habitCheckboxes = document.querySelectorAll(`[data-habit="${habit.id}"]`);
        let completed = 0;
        let total = 0;
        
        habitCheckboxes.forEach(cb => {
          const day = parseInt(cb.dataset.day);
          if (day <= CURRENT_DAY) {
            total++;
            if (cb.checked) completed++;
          }
        });
        
        return total > 0 ? Math.round((completed / total) * 100) : 0;
      });
      
      window.barChart.data.datasets[0].data = habitProgress;
      window.barChart.update('none');
    }
  }

  /* =====================
     CHECKBOX HANDLER
     ===================== */
  document.querySelectorAll(".habit-checkbox-wire").forEach(checkbox => {
    checkbox.addEventListener("change", async function() {
      const habitId = this.dataset.habit;
      const day = this.dataset.day;
      const isChecked = this.checked;
      
      this.classList.add('loading');
      
      try {
        const response = await fetch("/api/habit-log", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            habit_id: habitId,
            day: day,
            status: isChecked
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          recalculateProgress();
          showToast("✓", true);
        } else {
          this.checked = !isChecked;
          showToast("✗", false);
        }
      } catch (error) {
        console.error("Error:", error);
        this.checked = !isChecked;
        showToast("Error", false);
      } finally {
        this.classList.remove('loading');
      }
    });
  });

  /* =====================
     ADD HABIT
     ===================== */
  const addHabitModal = new bootstrap.Modal(document.getElementById('addHabitModal'));
  const saveHabitBtn = document.getElementById('saveHabitBtn');
  const habitNameInput = document.getElementById('habitName');

  saveHabitBtn.addEventListener('click', async () => {
    const habitName = habitNameInput.value.trim();
    
    if (!habitName) {
      habitNameInput.classList.add('is-invalid');
      document.getElementById('addHabitError').textContent = 'Please enter a habit name';
      return;
    }

    saveHabitBtn.disabled = true;
    saveHabitBtn.textContent = 'Adding...';

    try {
      const response = await fetch('/api/habit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: habitName })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        addHabitModal.hide();
        habitNameInput.value = '';
        habitNameInput.classList.remove('is-invalid');
        
        // Reload page to show new habit
        window.location.reload();
      } else {
        habitNameInput.classList.add('is-invalid');
        document.getElementById('addHabitError').textContent = data.error || 'Failed to add habit';
      }
    } catch (error) {
      console.error('Error:', error);
      habitNameInput.classList.add('is-invalid');
      document.getElementById('addHabitError').textContent = 'Network error';
    } finally {
      saveHabitBtn.disabled = false;
      saveHabitBtn.textContent = 'Add Habit';
    }
  });

  // Clear validation on input
  habitNameInput.addEventListener('input', () => {
    habitNameInput.classList.remove('is-invalid');
  });

  /* =====================
     EDIT HABIT
     ===================== */
  const editHabitModal = new bootstrap.Modal(document.getElementById('editHabitModal'));
  const updateHabitBtn = document.getElementById('updateHabitBtn');
  const editHabitNameInput = document.getElementById('editHabitName');
  const editHabitIdInput = document.getElementById('editHabitId');

  document.querySelectorAll('.edit-task-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const habitId = btn.dataset.habitId;
      const habitName = btn.dataset.habitName;
      
      editHabitIdInput.value = habitId;
      editHabitNameInput.value = habitName;
      editHabitNameInput.classList.remove('is-invalid');
      
      editHabitModal.show();
    });
  });

  updateHabitBtn.addEventListener('click', async () => {
    const habitId = editHabitIdInput.value;
    const habitName = editHabitNameInput.value.trim();
    
    if (!habitName) {
      editHabitNameInput.classList.add('is-invalid');
      document.getElementById('editHabitError').textContent = 'Please enter a habit name';
      return;
    }

    updateHabitBtn.disabled = true;
    updateHabitBtn.textContent = 'Updating...';

    try {
      const response = await fetch(`/api/habit/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: habitName })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        editHabitModal.hide();
        window.location.reload();
      } else {
        editHabitNameInput.classList.add('is-invalid');
        document.getElementById('editHabitError').textContent = data.error || 'Failed to update habit';
      }
    } catch (error) {
      console.error('Error:', error);
      editHabitNameInput.classList.add('is-invalid');
      document.getElementById('editHabitError').textContent = 'Network error';
    } finally {
      updateHabitBtn.disabled = false;
      updateHabitBtn.textContent = 'Update Habit';
    }
  });

  editHabitNameInput.addEventListener('input', () => {
    editHabitNameInput.classList.remove('is-invalid');
  });

  /* =====================
     DELETE HABIT
     ===================== */
  document.querySelectorAll('.delete-task-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const habitId = btn.dataset.habitId;
      
      if (!confirm('Are you sure you want to delete this habit? All tracking data will be lost.')) {
        return;
      }

      try {
        const response = await fetch(`/api/habit/${habitId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showToast('Habit deleted', true);
          setTimeout(() => window.location.reload(), 1000);
        } else {
          showToast('Failed to delete habit', false);
        }
      } catch (error) {
        console.error('Error:', error);
        showToast('Network error', false);
      }
    });
  });

  /* =====================
     INITIALIZE CHARTS
     ===================== */
  const currentTheme = htmlElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#e8eaed' : '#212529';

  // Circle Chart
  const circleCanvas = document.getElementById("circleChart");
  if (circleCanvas) {
    const circleCtx = circleCanvas.getContext("2d");
    window.circleChart = new Chart(circleCtx, {
      type: "doughnut",
      data: {
        labels: ["Completed", "Remaining"],
        datasets: [{
          data: [TODAY_PROGRESS, 100 - TODAY_PROGRESS],
          backgroundColor: ["#198754", isDark ? "#404550" : "#e9ecef"],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: 'bottom',
            labels: { padding: 10, font: { size: 10 }, color: textColor }
          },
          tooltip: {
            callbacks: {
              label: (context) => context.label + ': ' + context.parsed + '%'
            }
          }
        },
        cutout: '65%',
        animation: { duration: 0 }
      }
    });
  }

  // Area Chart
  const areaCanvas = document.getElementById("areaChart");
  if (areaCanvas && typeof DAILY_PROGRESS !== "undefined") {
    const areaCtx = areaCanvas.getContext("2d");
    window.areaChart = new Chart(areaCtx, {
      type: "line",
      data: {
        labels: DAILY_PROGRESS.map((_, i) => i + 1),
        datasets: [{
          label: "Daily %",
          data: DAILY_PROGRESS,
          fill: true,
          tension: 0.4,
          backgroundColor: "rgba(13, 110, 253, 0.15)",
          borderColor: "#0d6efd",
          pointBackgroundColor: "#0d6efd",
          pointBorderColor: "#fff",
          pointBorderWidth: 1,
          pointRadius: 2,
          pointHoverRadius: 4,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 8,
            titleFont: { size: 10 },
            bodyFont: { size: 9 },
            callbacks: {
              title: (context) => 'Day ' + context[0].label,
              label: (context) => context.parsed.y + '%'
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { font: { size: 9 }, maxRotation: 0, autoSkip: true, maxTicksLimit: 10, color: textColor }
          },
          y: {
            min: 0, max: 100,
            grid: { color: gridColor },
            ticks: { stepSize: 25, font: { size: 9 }, callback: (value) => value + '%', color: textColor }
          }
        },
        animation: { duration: 0 }
      }
    });
  }

  // Bar Chart
  const barCanvas = document.getElementById("barChart");
  if (barCanvas && typeof HABITS !== "undefined" && HABITS.length > 0) {
    const barCtx = barCanvas.getContext("2d");
    
    const habitProgress = HABITS.map(habit => {
      const habitCheckboxes = document.querySelectorAll(`[data-habit="${habit.id}"]`);
      let completed = 0, total = 0;
      
      habitCheckboxes.forEach(cb => {
        const day = parseInt(cb.dataset.day);
        if (day <= CURRENT_DAY) {
          total++;
          if (cb.checked) completed++;
        }
      });
      
      return total > 0 ? Math.round((completed / total) * 100) : 0;
    });
    
    window.barChart = new Chart(barCtx, {
      type: "bar",
      data: {
        labels: HABITS.map(h => h.name.length > 12 ? h.name.substring(0, 12) + '...' : h.name),
        datasets: [{
          label: "%",
          data: habitProgress,
          backgroundColor: "#0d6efd",
          borderRadius: 3,
          barThickness: 15
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (context) => context.parsed.x + '%' } }
        },
        scales: {
          x: {
            min: 0, max: 100,
            grid: { color: gridColor },
            ticks: { stepSize: 50, font: { size: 9 }, callback: (value) => value + '%', color: textColor }
          },
          y: {
            grid: { display: false },
            ticks: { font: { size: 8 }, color: textColor }
          }
        },
        animation: { duration: 0 }
      }
    });
  }

});