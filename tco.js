function generateChart() {
  const fteCount = parseFloat(document.getElementById("fteCount").value);
  const fteArc = getFteArcValue();
  const savingsPct = parseFloat(document.getElementById("savingsPct").value);
  const deviceCount = parseFloat(document.getElementById("deviceCount").value);
  const costPerDevice = parseFloat(document.getElementById("costPerDevice").value);

  if (
    isNaN(fteCount) || isNaN(fteArc) || isNaN(savingsPct) ||
    isNaN(deviceCount) || isNaN(costPerDevice)
  ) {
    alert("Please enter valid numbers for all fields.");
    return;
  }

  // We'll use a larger x range to ensure we have enough values
  const xValues = Array.from({ length: 40 }, (_, i) => i + 1);
  const hyperscalerSpend = [];
  const repatriationCost = [];
  const savings = [];
  const fteCosts = [];

  xValues.forEach(x => {
    const hsSpend = 2000 * x * x;
    const numDevices = Math.max(Math.floor(hsSpend / costPerDevice), 1);
    // FTE count is now always the user input, not a fallback
    const numFTE = fteCount * (fteArc / 12); // MATCHES EXCEL: monthly ARC
    const repCost = hsSpend - (hsSpend * (savingsPct / 100)) + numFTE; // MATCHES EXCEL
    const calculatedSavings = hsSpend - repCost;

    hyperscalerSpend.push(hsSpend);
    repatriationCost.push(repCost);
    savings.push(calculatedSavings);
    fteCosts.push(numFTE);
  });

  // Find the first index where savings become positive
  let firstPositiveIdx = savings.findIndex(val => val > 0);
  // Show 3 x values before that, but not less than 0
  let startIdx = Math.max(firstPositiveIdx - 3, 0);
  // Show 15 x values after that (total 15 values)
  let endIdx = startIdx + 15;
  // Slice arrays to show only from startIdx to endIdx
  const displayXValues = xValues.slice(startIdx, endIdx);
  const displayHyperscalerSpend = hyperscalerSpend.slice(startIdx, endIdx);
  const displayRepatriationCost = repatriationCost.slice(startIdx, endIdx);
  const displaySavings = savings.slice(startIdx, endIdx);
  const displayFteCosts = fteCosts.slice(startIdx, endIdx);

  // Format function for axis labels (e.g., 1.2K, 3.4M)
  function formatShortNumber(value) {
    if (value >= 1_000_000) {
      return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
    } else if (value >= 1_000) {
      return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
    } else {
      return value.toString();
    }
  }

  // Use formatted hyperscaler spend for x-axis labels
  const xLabels = displayHyperscalerSpend.map(val => formatShortNumber(val));
  const lineLabels = hyperscalerSpend.map(val => formatShortNumber(val));

  const ctx = document.getElementById("tcoChart").getContext("2d");

  if (window.tcoChart && typeof window.tcoChart.destroy === "function") {
    window.tcoChart.destroy();
  }

  window.tcoChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: xLabels,
      datasets: [
        {
          label: 'Hyperscaler Spend ($)',
          data: displayHyperscalerSpend,
          backgroundColor: 'rgba(54,162,235,0.6)',
          borderColor: '#36A2EB',
          borderWidth: 1
        },
        {
          label: 'Repatriation Cost ($)',
          data: displayRepatriationCost,
          backgroundColor: 'rgba(255,99,132,0.6)',
          borderColor: '#FF6384',
          borderWidth: 1
        },
        {
          label: 'FTE Cost ($)',
          data: displayFteCosts,
          backgroundColor: 'rgba(255,206,86,0.6)',
          borderColor: '#FFCE56',
          borderWidth: 1
        },
        {
          label: 'Savings ($)',
          data: displaySavings,
          backgroundColor: 'rgba(75,192,192,0.6)',
          borderColor: '#4BC0C0',
          borderWidth: 1
        }
      ]
    },
    options: {
      responsive: false, // Disable responsiveness to prevent resizing animation
      animation: false, // Disable all animations
      plugins: {
        title: {
          display: true,
          text: 'TCO Model (Total Cost of Ownership)'
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 20,
            padding: 15,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `${context.dataset.label}: $${context.parsed.y.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cost ($)'
          },
          ticks: {
            callback: function(value) {
              if (value >= 1_000_000) return (value/1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
              if (value >= 1_000) return (value/1_000).toFixed(1).replace(/\.0$/, '') + 'K';
              return value;
            }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Hyperscaler Spend ($)'
          },
          stacked: false
        }
      }
    }
  });

  // --- Line Chart for Repatriation Cost vs Hyperscaler Spend ---
  const lineCtx = document.getElementById("lineChart").getContext("2d");

  // Find intersection index where repatriation cost becomes less than hyperscaler spend
  let intersectionIdx = -1;
  for (let i = 0; i < repatriationCost.length; i++) {
    if (repatriationCost[i] < hyperscalerSpend[i]) {
      intersectionIdx = i;
      break;
    }
  }

  // Prepare intersection point for annotation
  let intersectionPoint = null;
  if (intersectionIdx !== -1) {
    intersectionPoint = {
      x: xValues[intersectionIdx],
      y: repatriationCost[intersectionIdx]
    };
  }

  // Draw the line chart
  if (window.lineChart && typeof window.lineChart.destroy === "function") {
    window.lineChart.destroy();
  }

  window.lineChart = new Chart(lineCtx, {
    type: 'line',
    data: {
      labels: lineLabels,
      datasets: [
        {
          label: 'Hyperscaler Spend ($)',
          data: hyperscalerSpend,
          borderColor: '#36A2EB',
          backgroundColor: 'rgba(54,162,235,0.1)',
          fill: false,
          tension: 0.1,
          pointRadius: 0
        },
        {
          label: 'Repatriation Cost ($)',
          data: repatriationCost,
          borderColor: '#FF6384',
          backgroundColor: 'rgba(255,99,132,0.1)',
          fill: false,
          tension: 0.1,
          pointRadius: 0
        },
        // Highlight intersection point
        intersectionPoint ? {
          label: 'Intersection',
          data: Array(hyperscalerSpend.length).fill(null).map((_, i) => i === intersectionIdx ? repatriationCost[intersectionIdx] : null),
          borderColor: '#FFA500',
          backgroundColor: '#FFA500',
          pointRadius: 8,
          type: 'scatter',
          showLine: false,
          order: 3
        } : null
      ].filter(Boolean)
    },
    options: {
      responsive: false, // Disable responsiveness to prevent resizing animation
      animation: false, // Disable all animations
      plugins: {
        title: {
          display: true,
          text: 'Repatriation Cost vs Hyperscaler Spend (Line Graph)'
        },
        legend: {
          display: true,
          position: 'top',
          labels: {
            boxWidth: 20,
            padding: 15,
            font: {
              size: 14
            }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              if (context.dataset.label === 'Intersection') {
                return `Intersection: $${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
              }
              return `${context.dataset.label}: $${context.parsed.y.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          title: {
            display: true,
            text: 'Cost ($)'
          },
          ticks: {
            callback: function(value) {
              if (value >= 1_000_000) return (value/1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
              if (value >= 1_000) return (value/1_000).toFixed(1).replace(/\.0$/, '') + 'K';
              return value;
            }
          }
        },
        x: {
          title: {
            display: true,
            text: 'Hyperscaler Spend ($)'
          }
        }
      }
    }
  });
}

// Add download buttons for both charts
function addDownloadButtons() {
  if (!document.getElementById('downloadBarChartBtn')) {
    const btn = document.createElement('button');
    btn.id = 'downloadBarChartBtn';
    btn.className = 'download-btn';
    btn.textContent = 'Download Bar Chart';
    btn.onclick = function() {
      const chart = window.tcoChart;
      if (chart) {
        const link = document.createElement('a');
        link.href = chart.toBase64Image();
        link.download = 'bar_chart.png';
        link.click();
      }
    };
    document.getElementById('tcoChart').parentNode.insertBefore(btn, document.getElementById('tcoChart'));
  }
  if (!document.getElementById('downloadLineChartBtn')) {
    const btn = document.createElement('button');
    btn.id = 'downloadLineChartBtn';
    btn.className = 'download-btn';
    btn.textContent = 'Download Line Chart';
    btn.onclick = function() {
      const chart = window.lineChart;
      if (chart) {
        const link = document.createElement('a');
        link.href = chart.toBase64Image();
        link.download = 'line_chart.png';
        link.click();
      }
    };
    document.getElementById('lineChart').parentNode.insertBefore(btn, document.getElementById('lineChart'));
  }
}

// Call after chart creation
addDownloadButtons();

// Add dynamic title update logic
function updateDynamicTitle() {
  const fteCount = document.getElementById("fteCount").value || 4;
  const arc = document.getElementById("fteArc").value || 300000; // changed example to 300,000
  const savings = document.getElementById("savingsPct").value || 25; // changed example to 25%
  const deviceCount = document.getElementById("deviceCount").value || 1200;
  const costPerDevice = document.getElementById("costPerDevice").value || 900; // changed example to 900

  document.getElementById("fteCountSpan").textContent = fteCount;
  document.getElementById("arcSpan").textContent = formatArc(arc);
  document.getElementById("savingsSpan").textContent = savings + "%";
  document.getElementById("deviceCountSpan").textContent = deviceCount;
  document.getElementById("costPerDeviceSpan").textContent = costPerDevice;
}

function formatArc(val) {
  // Remove commas and parse as number
  if (typeof val === 'string') {
    val = val.replace(/,/g, '');
  }
  val = parseInt(val, 10);
  if (isNaN(val)) return '';
  if (val >= 1_000_000) return (val / 1_000_000).toFixed(val % 1_000_000 === 0 ? 0 : 1) + "M";
  if (val >= 1_000) return (val / 1_000).toFixed(val % 1_000 === 0 ? 0 : 1) + "K";
  return val;
}

["fteCount", "savingsPct", "deviceCount", "costPerDevice", "fteArc"].forEach(id => {
  const el = document.getElementById(id);
  if (el) el.addEventListener("input", updateDynamicTitle);
});

// FTE ARC input formatting (now type text)
var fteArcInput = document.getElementById('fteArc');
if (fteArcInput) {
  fteArcInput.addEventListener('input', function(e) {
    let raw = fteArcInput.value.replace(/[^\d]/g, '');
    if (raw) {
      let formatted = Number(raw).toLocaleString();
      // Save cursor position from the end
      let oldLength = fteArcInput.value.length;
      let oldCursor = fteArcInput.selectionStart;
      fteArcInput.value = formatted;
      let newLength = formatted.length;
      let newCursor = oldCursor + (newLength - oldLength);
      fteArcInput.setSelectionRange(newCursor, newCursor);
    } else {
      fteArcInput.value = '';
    }
  });
}

// Update validation for FTE ARC (text input)
function allInputsValid() {
  let valid = true;
  numberInputs.forEach(input => {
    if (input.value === '' || isNaN(input.value) || Number(input.value) < 0) {
      input.classList.add('input-error');
      input.setCustomValidity('Please enter a non-negative number.');
      input.reportValidity();
      valid = false;
    }
  });
  // FTE ARC validation (text input)
  if (fteArcInput) {
    let arcRaw = fteArcInput.value.replace(/[^\d]/g, '');
    if (arcRaw === '' || isNaN(Number(arcRaw)) || Number(arcRaw) < 0) {
      fteArcInput.classList.add('input-error');
      fteArcInput.setCustomValidity('Please enter a non-negative number.');
      fteArcInput.reportValidity();
      valid = false;
    } else {
      fteArcInput.classList.remove('input-error');
      fteArcInput.setCustomValidity('');
    }
  }
  return valid;
}

// Update all usages of FTE ARC value to parseInt stripping commas
function getFteArcValue() {
  var fteArcInput = document.getElementById('fteArc');
  if (!fteArcInput) return 0;
  var raw = fteArcInput.value.replace(/[^\d]/g, '');
  return parseFloat(raw);
}

// Initialize on load
updateDynamicTitle();

// Ensure only one event handler and block default form submission
window.addEventListener('DOMContentLoaded', function() {
  const numberInputs = document.querySelectorAll('input[type="number"]');
  const fteArcInput = document.getElementById('fteArc');
  numberInputs.forEach(input => {
    input.setAttribute('min', '0');
    input.addEventListener('input', function() {
      if (this.value === '' || isNaN(this.value) || Number(this.value) < 0) {
        this.classList.add('input-error');
        this.setCustomValidity('Please enter a non-negative number.');
        this.reportValidity();
      } else {
        this.classList.remove('input-error');
        this.setCustomValidity('');
      }
    });
  });

  // FTE ARC validation (text input)
  if (fteArcInput) {
    fteArcInput.addEventListener('input', function() {
      let arcRaw = fteArcInput.value.replace(/[^\d]/g, '');
      if (arcRaw === '' || isNaN(Number(arcRaw)) || Number(arcRaw) < 0) {
        fteArcInput.classList.add('input-error');
        fteArcInput.setCustomValidity('Please enter a non-negative number.');
        fteArcInput.reportValidity();
      } else {
        fteArcInput.classList.remove('input-error');
        fteArcInput.setCustomValidity('');
      }
    });
  }

  // Find the calculate button and form
  const calcBtn = document.getElementById('calculateBtn');
  const form = calcBtn ? calcBtn.closest('form') : null;
  function allInputsValid() {
    let valid = true;
    numberInputs.forEach(input => {
      if (input.value === '' || isNaN(input.value) || Number(input.value) < 0) {
        input.classList.add('input-error');
        input.setCustomValidity('Please enter a non-negative number.');
        input.reportValidity();
        valid = false;
      } else {
        input.classList.remove('input-error');
        input.setCustomValidity('');
      }
    });
    // FTE ARC validation (text input)
    if (fteArcInput) {
      let arcRaw = fteArcInput.value.replace(/[^\d]/g, '');
      if (arcRaw === '' || isNaN(Number(arcRaw)) || Number(arcRaw) < 0) {
        fteArcInput.classList.add('input-error');
        fteArcInput.setCustomValidity('Please enter a non-negative number.');
        fteArcInput.reportValidity();
        valid = false;
      } else {
        fteArcInput.classList.remove('input-error');
        fteArcInput.setCustomValidity('');
      }
    }
    return valid;
  }
  function showResults() {
    document.getElementById('equinixHeader').style.display = '';
    document.getElementById('tcoResults').style.display = '';
  }
  if (form) {
    form.addEventListener('submit', function(e) {
      if (!allInputsValid()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      e.preventDefault(); // Prevent default form submit
      showResults();
      generateChart();
    });
  } else if (calcBtn) {
    calcBtn.addEventListener('click', function(e) {
      if (!allInputsValid()) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
      showResults();
      generateChart();
    });
  }
});
