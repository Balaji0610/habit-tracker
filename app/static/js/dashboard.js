document.addEventListener("DOMContentLoaded", () => {

  /* =====================
     SAVE CHECKBOX STATE
     ===================== */
  document.querySelectorAll("input[type='checkbox']").forEach(cb => {
    cb.addEventListener("change", () => {
      fetch("/api/habit-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          habit_id: cb.dataset.habit,
          day: cb.dataset.day,
          status: cb.checked
        })
      }).then(() => location.reload());
    });
  });

  /* =====================
     PROGRESS CHART
     ===================== */
  const ctx = document.getElementById("progressChart");

  if (ctx && typeof DAILY_PROGRESS !== "undefined") {
    new Chart(ctx, {
      type: "line",
      data: {
        labels: DAILY_PROGRESS.map((_, i) => i + 1),
        datasets: [{
          label: "Daily Progress %",
          data: DAILY_PROGRESS,
          fill: true,
          tension: 0.4,
          backgroundColor: "rgba(76,175,80,0.25)",
          borderColor: "#4caf50",
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            labels: {
              font: { size: 11 }
            }
          }
        },
        scales: {
          x: {
            ticks: {
              font: { size: 10 }
            }
          },
          y: {
            min: 0,
            max: 100,
            ticks: {
              stepSize: 25,
              font: { size: 10 }
            }
          }
        }
      }
    });
  }

});
