document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     INITIALIZE TOAST
     ===================== */
  const toastEl = document.getElementById('saveToast');
  const toast = new bootstrap.Toast(toastEl, {
    autohide: true,
    delay: 2000
  });

  /* =====================
     UPDATE STATS DISPLAY
     ===================== */
  function updateStats(data) {
    if (data.completed_today !== undefined) {
      document.getElementById('completed-today').textContent = data.completed_today;
    }
    if (data.today_progress !== undefined) {
      document.getElementById('today-progress').textContent = data.today_progress + '%';
    }
    if (data.monthly_progress !== undefined) {
      document.getElementById('monthly-progress').textContent = data.monthly_progress + '%';
    }
  }

  /* =====================
     SHOW TOAST MESSAGE
     ===================== */
  function showToast(message, isSuccess = true) {
    const toastMessage = document.getElementById('toastMessage');
    toastMessage.textContent = message;
    
    // Update toast styling
    toastEl.classList.remove('bg-success', 'bg-danger', 'text-white');
    if (isSuccess) {
      toastEl.classList.add('bg-success', 'text-white');
    } else {
      toastEl.classList.add('bg-danger', 'text-white');
    }
    
    toast.show();
  }

  /* =====================
     SAVE CHECKBOX STATE
     ===================== */
  document.querySelectorAll(".habit-checkbox").forEach(checkbox => {
    
    checkbox.addEventListener("change", async function() {
      const habitId = this.dataset.habit;
      const day = this.dataset.day;
      const isChecked = this.checked;
      
      // Add loading state
      this.classList.add('loading');
      
      try {
        const response = await fetch("/api/habit-log", {
          method: "POST",
          headers: { 
            "Content-Type": "application/json" 
          },
          body: JSON.stringify({
            habit_id: habitId,
            day: day,
            status: isChecked
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          // Update stats without reloading
          updateStats(data);
          
          // Update chart
          updateChart(habitId, day, isChecked);
          
          // Show success message
          showToast(isChecked ? "✓ Habit marked complete" : "Habit unmarked", true);
        } else {
          // Revert checkbox on error
          this.checked = !isChecked;
          showToast(data.error || "Failed to save habit", false);
        }
        
      } catch (error) {
        console.error("Error saving habit:", error);
        // Revert checkbox on error
        this.checked = !isChecked;
        showToast("Network error. Please try again.", false);
      } finally {
        // Remove loading state
        this.classList.remove('loading');
      }
    });
  });

  /* =====================
     UPDATE CHART
     ===================== */
  function updateChart(habitId, day, isChecked) {
    // This is a simplified update - you could make this more sophisticated
    // by recalculating the entire day's progress
    if (window.progressChart && DAILY_PROGRESS) {
      // For now, just trigger a visual update
      // In a more complex implementation, you'd recalculate the progress for that day
      window.progressChart.update();
    }
  }

  /* =====================
     PROGRESS CHART
     ===================== */
  const canvas = document.getElementById("progressChart");

  // Safety checks
  if (!canvas || typeof DAILY_PROGRESS === "undefined" || !Array.isArray(DAILY_PROGRESS) || DAILY_PROGRESS.length === 0) {
    console.warn("Chart not rendered: missing data or canvas");
    if (canvas) {
      canvas.parentElement.innerHTML = '<p class="text-muted text-center py-4">No data available for chart</p>';
    }
    return;
  }

  const ctx = canvas.getContext("2d");

  window.progressChart = new Chart(ctx, {
    type: "line",
    data: {
      labels: DAILY_PROGRESS.map((_, i) => i + 1),
      datasets: [{
        label: "Daily Completion %",
        data: DAILY_PROGRESS,
        fill: true,
        tension: 0.4,
        backgroundColor: "rgba(13, 110, 253, 0.1)",
        borderColor: "#0d6efd",
        pointBackgroundColor: "#0d6efd",
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderWidth: 3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          labels: {
            font: { 
              size: 12,
              family: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto"
            },
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 13
          },
          bodyFont: {
            size: 12
          },
          callbacks: {
            title: function(context) {
              return 'Day ' + context[0].label;
            },
            label: function(context) {
              return 'Completion: ' + context.parsed.y + '%';
            }
          }
        }
      },
      scales: {
        x: {
          title: {
            display: true,
            text: 'Day of Month',
            font: {
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            display: false
          },
          ticks: {
            font: { size: 11 },
            maxRotation: 0
          }
        },
        y: {
          min: 0,
          max: 100,
          title: {
            display: true,
            text: 'Completion %',
            font: {
              size: 12,
              weight: 'bold'
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            stepSize: 25,
            font: { size: 11 },
            callback: function(value) {
              return value + '%';
            }
          }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });

});