# 3D CNN Visualization

An interactive 3D visualization of a Convolutional Neural Network (LeNet-5) trained on MNIST. Draw a digit and watch the network light up in real-time.

**[Live Demo](https://purna94.github.io/cnn-3d-visualization/)**

## Features

- **3D Interactive Scene** — Rotate, pan, and zoom using mouse/touch. Built with Three.js.
- **Live Digit Recognition** — Draw any digit 0–9 and see the network's prediction instantly.
- **Layer-by-Layer Visualization** — Every neuron rendered as a colored 3D cube:
  - **Input Layer** (28×28) — The raw drawing
  - **Conv Layer 1** (8 filters, 24×24) — Edge and curve detection
  - **Pool Layer 1** (8×12×12) — Downsampling
  - **Conv Layer 2** (16 filters, 8×8) — Higher-level features
  - **Pool Layer 2** (16×4×4) — Further downsampling
  - **Output Layer** (10 digits) — Softmax probabilities
- **Node Coloring** — Activation intensity mapped to color (dark → blue → green → yellow)
- **Hover Details** — Hover over any neuron to see its exact activation value
- **Layer Toggles** — Show/hide individual layers to see inside the network
- **Connection Edges** — Visual connections between layers
- **Touch Support** — Works on mobile devices

## Architecture

The network is a variant of LeNet-5:

| Layer | Output Shape | Parameters |
|-------|-------------|-----------|
| Input | 28×28×1 | 0 |
| Conv2D (5×5, 8 filters, ReLU) | 24×24×8 | 208 |
| MaxPool (2×2) | 12×12×8 | 0 |
| Conv2D (5×5, 16 filters, ReLU) | 8×8×16 | 3,216 |
| MaxPool (2×2) | 4×4×16 | 0 |
| Flatten | 256 | 0 |
| Dense (10, Softmax) | 10 | 2,570 |
| **Total** | | **5,994** |

The forward pass is implemented in vanilla JavaScript (no deep learning framework needed).

## Tech Stack

- [Three.js](https://threejs.org/) — 3D rendering
- Vanilla JS — Neural network forward pass
- [PyTorch](https://pytorch.org/) — Model training

## Usage

1. Open the [live demo](https://purna94.github.io/cnn-3d-visualization/)
2. Wait for the model weights to load
3. Draw a digit (0–9) in the canvas
4. Watch the 3D network light up with activations
5. Hover over neurons to see values
6. Use layer toggles in the sidebar

## Retraining the Model

To train your own model:

```bash
pip install torch torchvision
python train.py
```

This will train a CNN on MNIST for 5 epochs (~98–99% accuracy) and save the weights to `model/weights.json`.

## Project Structure

```
├── index.html              # Main page
├── css/
│   └── style.css           # Styles
├── js/
│   ├── main.js             # Entry point
│   ├── network.js          # CNN forward pass
│   ├── visualization.js    # Three.js 3D scene
│   ├── drawing.js          # Drawing canvas
│   └── colormap.js         # Color mapping
├── model/
│   └── weights.json        # Pre-trained weights
└── train.py                # Training script
```

## License

MIT
