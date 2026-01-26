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
    const textColor = isDark ? '#f9fafb' : '#111827';

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
      const completedEl = document.getElementById('completed-today');
      animateNumber(completedEl, parseInt(completedEl.textContent), data.completed_today);
    }
    if (data.today_progress !== undefined) {
      const progressEl = document.getElementById('today-progress');
      animateNumber(progressEl, parseInt(progressEl.textContent), data.today_progress, '%');
    }
  }

  function animateNumber(element, start, end, suffix = '') {
    const duration = 500;
    const startTime = performance.now();
    
    function update(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      const current = Math.floor(start + (end - start) * easeOutQuad(progress));
      element.textContent = current + suffix;
      
      if (progress < 1) {
        requestAnimationFrame(update);
      }
    }
    
    requestAnimationFrame(update);
  }

  function easeOutQuad(t) {
    return t * (2 - t);
  }

  /* =====================
     CALCULATE TODAY'S STATS
     ===================== */
  function calculateTodayStats() {
    // Get all checkboxes for today's column (CURRENT_DAY)
    const todayCheckboxes = document.querySelectorAll(`[data-day="${CURRENT_DAY}"]`);
    
    if (todayCheckboxes.length === 0) {
      return { completed: 0, total: 0, percentage: 0 };
    }
    
    let completedCount = 0;
    todayCheckboxes.forEach(checkbox => {
      if (checkbox.checked && !checkbox.disabled) {
        completedCount++;
      }
    });
    
    const totalCount = todayCheckboxes.length;
    const percentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    
    return {
      completed: completedCount,
      total: totalCount,
      percentage: percentage
    };
  }

  /* =====================
     RECALCULATE PROGRESS
     ===================== */
  function recalculateProgress() {
    const checkboxes = document.querySelectorAll('.habit-checkbox-wire');
    const habitsByDay = {};
    
    // Group checkboxes by day
    checkboxes.forEach(cb => {
      const day = parseInt(cb.dataset.day);
      if (!habitsByDay[day]) {
        habitsByDay[day] = [];
      }
      habitsByDay[day].push(cb.checked);
    });
    
    // Calculate daily progress for area chart
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
    
    // Calculate today's stats accurately
    const todayStats = calculateTodayStats();
    
    // Update stat cards with accurate numbers
    const completedEl = document.getElementById('completed-today');
    const progressEl = document.getElementById('today-progress');
    
    if (completedEl && progressEl) {
      const currentCompleted = parseInt(completedEl.textContent) || 0;
      const currentProgress = parseInt(progressEl.textContent) || 0;
      
      animateNumber(completedEl, currentCompleted, todayStats.completed);
      animateNumber(progressEl, currentProgress, todayStats.percentage, '%');
    }
    
    // Update circle chart
    if (window.circleChart) {
      window.circleChart.data.datasets[0].data = [
        todayStats.percentage, 
        100 - todayStats.percentage
      ];
      window.circleChart.update('active');
    }
    
    // Update area chart
    if (window.areaChart) {
      window.areaChart.data.labels = newDailyProgress.map((_, i) => i + 1);
      window.areaChart.data.datasets[0].data = newDailyProgress;
      window.areaChart.update('active');
    }
    
    // Update bar chart (habit-wise progress)
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
      window.barChart.update('active');
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
          // Recalculate all progress metrics
          recalculateProgress();
          showToast(isChecked ? "✓ Marked complete!" : "Unmarked", true);
        } else {
          this.checked = !isChecked;
          showToast("Failed to save", false);
        }
      } catch (error) {
        console.error("Error:", error);
        this.checked = !isChecked;
        showToast("Connection error", false);
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
  const addHabitForm = document.getElementById('addHabitForm');

  // Handle Enter key in form
  addHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveHabitBtn.click();
  });

  saveHabitBtn.addEventListener('click', async () => {
    const habitName = habitNameInput.value.trim();
    
    if (!habitName) {
      habitNameInput.classList.add('is-invalid');
      document.getElementById('addHabitError').textContent = 'Please enter a habit name';
      return;
    }

    if (habitName.length > 50) {
      habitNameInput.classList.add('is-invalid');
      document.getElementById('addHabitError').textContent = 'Habit name is too long (max 50 characters)';
      return;
    }

    saveHabitBtn.disabled = true;
    const originalText = saveHabitBtn.innerHTML;
    saveHabitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Adding...';

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
        showToast('Habit added successfully!', true);
        
        // Reload page after short delay
        setTimeout(() => window.location.reload(), 800);
      } else {
        habitNameInput.classList.add('is-invalid');
        document.getElementById('addHabitError').textContent = data.error || 'Failed to add habit';
        saveHabitBtn.disabled = false;
        saveHabitBtn.innerHTML = originalText;
      }
    } catch (error) {
      console.error('Error:', error);
      habitNameInput.classList.add('is-invalid');
      document.getElementById('addHabitError').textContent = 'Network error. Please try again.';
      saveHabitBtn.disabled = false;
      saveHabitBtn.innerHTML = originalText;
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
  const editHabitForm = document.getElementById('editHabitForm');

  // Handle Enter key in form
  editHabitForm.addEventListener('submit', (e) => {
    e.preventDefault();
    updateHabitBtn.click();
  });

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

    if (habitName.length > 50) {
      editHabitNameInput.classList.add('is-invalid');
      document.getElementById('editHabitError').textContent = 'Habit name is too long (max 50 characters)';
      return;
    }

    updateHabitBtn.disabled = true;
    const originalText = updateHabitBtn.innerHTML;
    updateHabitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Updating...';

    try {
      const response = await fetch(`/api/habit/${habitId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: habitName })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        editHabitModal.hide();
        showToast('Habit updated successfully!', true);
        setTimeout(() => window.location.reload(), 800);
      } else {
        editHabitNameInput.classList.add('is-invalid');
        document.getElementById('editHabitError').textContent = data.error || 'Failed to update habit';
        updateHabitBtn.disabled = false;
        updateHabitBtn.innerHTML = originalText;
      }
    } catch (error) {
      console.error('Error:', error);
      editHabitNameInput.classList.add('is-invalid');
      document.getElementById('editHabitError').textContent = 'Network error. Please try again.';
      updateHabitBtn.disabled = false;
      updateHabitBtn.innerHTML = originalText;
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
      
      if (!confirm('Are you sure you want to delete this habit? All tracking data will be permanently lost.')) {
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

      try {
        const response = await fetch(`/api/habit/${habitId}`, {
          method: 'DELETE'
        });

        const data = await response.json();

        if (response.ok && data.success) {
          showToast('Habit deleted successfully', true);
          setTimeout(() => window.location.reload(), 800);
        } else {
          showToast('Failed to delete habit', false);
          btn.disabled = false;
          btn.innerHTML = '<i class="bi bi-trash-fill"></i>';
        }
      } catch (error) {
        console.error('Error:', error);
        showToast('Connection error', false);
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-trash-fill"></i>';
      }
    });
  });

  /* =====================
     INITIALIZE CHARTS
     ===================== */
  const currentTheme = htmlElement.getAttribute('data-theme');
  const isDark = currentTheme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)';
  const textColor = isDark ? '#f9fafb' : '#111827';

  // Calculate accurate today stats on page load
  const initialTodayStats = calculateTodayStats();

  // Circle Chart (Doughnut)
  const circleCanvas = document.getElementById("circleChart");
  if (circleCanvas) {
    const circleCtx = circleCanvas.getContext("2d");
    window.circleChart = new Chart(circleCtx, {
      type: "doughnut",
      data: {
        labels: ["Completed", "Remaining"],
        datasets: [{
          data: [initialTodayStats.percentage, 100 - initialTodayStats.percentage],
          backgroundColor: [
            isDark ? "#10b981" : "#10b981",
            isDark ? "#374151" : "#e5e7eb"
          ],
          borderWidth: 0,
          borderRadius: 4,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: 1,
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 12,
            titleFont: { size: 12 },
            bodyFont: { size: 11 },
            callbacks: {
              label: (context) => {
                const label = context.label || '';
                const value = context.parsed || 0;
                if (context.dataIndex === 0) {
                  return `${label}: ${initialTodayStats.completed}/${initialTodayStats.total} (${value}%)`;
                }
                return `${label}: ${value}%`;
              }
            }
          }
        },
        cutout: '70%',
        animation: {
          animateRotate: true,
          animateScale: true,
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });
  }

  // Area Chart (Line with fill)
  const areaCanvas = document.getElementById("areaChart");
  if (areaCanvas && typeof DAILY_PROGRESS !== "undefined") {
    const areaCtx = areaCanvas.getContext("2d");
    window.areaChart = new Chart(areaCtx, {
      type: "line",
      data: {
        labels: DAILY_PROGRESS.map((_, i) => i + 1),
        datasets: [{
          label: "Daily Progress",
          data: DAILY_PROGRESS,
          fill: true,
          tension: 0.4,
          backgroundColor: isDark ? "rgba(99, 102, 241, 0.15)" : "rgba(79, 70, 229, 0.15)",
          borderColor: isDark ? "#6366f1" : "#4f46e5",
          pointBackgroundColor: isDark ? "#6366f1" : "#4f46e5",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointHoverBorderWidth: 3,
          borderWidth: 2.5
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 10,
            titleFont: { size: 11 },
            bodyFont: { size: 10 },
            callbacks: {
              title: (context) => 'Day ' + context[0].label,
              label: (context) => 'Progress: ' + context.parsed.y + '%'
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { 
              font: { size: 10 }, 
              maxRotation: 0, 
              autoSkip: true, 
              maxTicksLimit: 15, 
              color: textColor 
            }
          },
          y: {
            min: 0, 
            max: 100,
            grid: { 
              color: gridColor,
              drawBorder: false 
            },
            ticks: { 
              stepSize: 25, 
              font: { size: 10 }, 
              callback: (value) => value + '%', 
              color: textColor 
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });
  }

  // Bar Chart (Horizontal)
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
        labels: HABITS.map(h => h.name.length > 15 ? h.name.substring(0, 15) + '...' : h.name),
        datasets: [{
          label: "Progress",
          data: habitProgress,
          backgroundColor: isDark ? "#6366f1" : "#4f46e5",
          borderRadius: 4,
          barThickness: 18
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { 
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            padding: 10,
            callbacks: { 
              label: (context) => 'Progress: ' + context.parsed.x + '%' 
            } 
          }
        },
        scales: {
          x: {
            min: 0, 
            max: 100,
            grid: { 
              color: gridColor,
              drawBorder: false 
            },
            ticks: { 
              stepSize: 50, 
              font: { size: 10 }, 
              callback: (value) => value + '%', 
              color: textColor 
            }
          },
          y: {
            grid: { display: false },
            ticks: { 
              font: { size: 9 }, 
              color: textColor 
            }
          }
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        }
      }
    });
  }

  /* =====================
     VERIFY INITIAL STATS ON LOAD
     ===================== */
  // Log to console for debugging
  console.log('Today Stats:', initialTodayStats);
  console.log(`Completed: ${initialTodayStats.completed}/${initialTodayStats.total} (${initialTodayStats.percentage}%)`);

});