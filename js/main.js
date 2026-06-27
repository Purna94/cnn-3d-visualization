function setStatus(text, pct) {
  document.getElementById('status-text').textContent = text;
  if (pct !== undefined) {
    document.getElementById('progress-fill').style.width = pct + '%';
  }
}

async function main() {
  setStatus('Initializing...', 5);
  VIS.init();
  DRAW.init();

  DRAW.setOnChange(async (inputData) => {
    if (!NET.weights) return;
    setStatus('Running inference...', 80);
    const result = NET.predict(inputData);
    if (result && result.length > 0) {
      document.getElementById('pred-1').textContent = result[0].digit;
      document.getElementById('pred-conf').textContent = (result[0].prob * 100).toFixed(1) + '%';
    }
    VIS.updateActivations(null, NET.activations);
    syncLayerVisibility();
    setStatus('Ready', 100);
  });

  await NET.init();

  const dummyInput = new Float32Array(28 * 28);
  NET.predict(dummyInput);
  if (NET.activations) {
    VIS.updateActivations(null, NET.activations);
  }

  DRAW.clear();
  setStatus('Draw a digit to begin!', 100);
}

function syncLayerVisibility() {
  NET.architecture.forEach(cfg => {
    const toggle = document.querySelector(`.toggle-switch[data-layer="${cfg.id}"]`);
    if (toggle) {
      const visible = toggle.classList.contains('active');
      VIS.setLayerVisibility(cfg.id, visible);
    }
  });
}

main().catch(err => {
  console.error(err);
  setStatus('Error: ' + err.message, 0);
});
