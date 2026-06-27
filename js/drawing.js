const DRAW = (function () {
  const DRAW_SIZE = 280;
  const INPUT_SIZE = 28;
  let canvas, ctx, previewCanvas, previewCtx;
  let isDrawing = false;
  let lastX = 0, lastY = 0;
  let onChangeCallback = null;

  function init() {
    canvas = document.getElementById('draw-canvas');
    ctx = canvas.getContext('2d');
    previewCanvas = document.getElementById('input-preview');
    previewCtx = previewCanvas.getContext('2d');

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, DRAW_SIZE, DRAW_SIZE);
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#fff';

    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDraw);
    canvas.addEventListener('mouseleave', stopDraw);
    canvas.addEventListener('touchstart', e => { e.preventDefault(); const t = e.touches[0]; startDraw({ offsetX: t.clientX - canvas.getBoundingClientRect().left, offsetY: t.clientY - canvas.getBoundingClientRect().top }); });
    canvas.addEventListener('touchmove', e => { e.preventDefault(); const t = e.touches[0]; draw({ offsetX: t.clientX - canvas.getBoundingClientRect().left, offsetY: t.clientY - canvas.getBoundingClientRect().top }); });
    canvas.addEventListener('touchend', e => { e.preventDefault(); stopDraw(); });

    document.getElementById('clear-btn').addEventListener('click', clear);
  }

  function startDraw(e) {
    isDrawing = true;
    const rect = canvas.getBoundingClientRect();
    lastX = e.offsetX || (e.clientX - rect.left);
    lastY = e.offsetY || (e.clientY - rect.top);
  }

  function draw(e) {
    if (!isDrawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.offsetX || (e.clientX - rect.left);
    const y = e.offsetY || (e.clientY - rect.top);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
    lastX = x; lastY = y;
    updatePreview();
  }

  function stopDraw() {
    if (!isDrawing) return;
    isDrawing = false;
    updatePreview();
    onChangeCallback && onChangeCallback(getInputData());
  }

  function clear() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, DRAW_SIZE, DRAW_SIZE);
    updatePreview();
    onChangeCallback && onChangeCallback(getInputData());
  }

  function updatePreview() {
    previewCtx.fillStyle = '#000';
    previewCtx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);
    previewCtx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
  }

  function getInputData() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = INPUT_SIZE;
    tempCanvas.height = INPUT_SIZE;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.drawImage(canvas, 0, 0, INPUT_SIZE, INPUT_SIZE);
    const imageData = tempCtx.getImageData(0, 0, INPUT_SIZE, INPUT_SIZE);
    const pixels = new Float32Array(INPUT_SIZE * INPUT_SIZE);
    for (let i = 0; i < pixels.length; i++) {
      pixels[i] = imageData.data[i * 4] / 255;
    }
    return pixels;
  }

  function setOnChange(callback) {
    onChangeCallback = callback;
  }

  return {
    init,
    getInputData,
    setOnChange,
    clear,
  };
})();
