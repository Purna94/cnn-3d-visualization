const NET = {
  weights: null,
  activations: {},

  architecture: [
    { id: 'input', name: 'Input Layer',     dims: [28, 28, 1] },
    { id: 'conv1', name: 'Conv Layer 1',    dims: [24, 24, 8] },
    { id: 'pool1', name: 'Pool Layer 1',    dims: [12, 12, 8] },
    { id: 'conv2', name: 'Conv Layer 2',    dims: [8, 8, 16] },
    { id: 'pool2', name: 'Pool Layer 2',    dims: [4, 4, 16] },
    { id: 'fc',    name: 'Output Layer',    dims: [10] },
  ],

  async init() {
    setStatus('Loading model weights...', 10);
    const res = await fetch('model/weights.json');
    if (!res.ok) throw new Error('Failed to load weights');
    this.weights = await res.json();
    setStatus('Model loaded! Draw a digit to begin.', 100);
  },

  forward(input) {
    const norm = input.map(v => (v - 0.1307) / 0.3081);
    const inputGrid = []; // [1][28][28]
    const grid = [];
    for (let r = 0; r < 28; r++) {
      const row = [];
      for (let c = 0; c < 28; c++) {
        row.push(norm[r * 28 + c]);
      }
      grid.push(row);
    }
    inputGrid.push(grid);

    const rawGrid = []; // input for display [1][28][28] raw values
    const raw = [];
    for (let r = 0; r < 28; r++) {
      const row = [];
      for (let c = 0; c < 28; c++) {
        row.push(input[r * 28 + c]);
      }
      raw.push(row);
    }
    rawGrid.push(raw);

    this.activations = {};
    this.activations.input = rawGrid;

    const conv1Out = this.conv2d(inputGrid, this.weights['conv1.weight'], this.weights['conv1.bias'], 5);
    const conv1Act = this.relu(conv1Out);
    this.activations.conv1 = conv1Act;

    const pool1Out = this.maxPool2d(conv1Act, 2);
    this.activations.pool1 = pool1Out;

    const conv2Out = this.conv2d(pool1Out, this.weights['conv2.weight'], this.weights['conv2.bias'], 5);
    const conv2Act = this.relu(conv2Out);
    this.activations.conv2 = conv2Act;

    const pool2Out = this.maxPool2d(conv2Act, 2);
    this.activations.pool2 = pool2Out;

    const flat = this.flatten(pool2Out);
    const fcOut = this.dense(flat, this.weights['fc.weight'], this.weights['fc.bias']);
    const output = this.softmax(fcOut);
    this.activations.fc = output;

    return output;
  },

  conv2d(input, weightData, biasData, kernelSize) {
    const inChannels = input.length;
    const outChannels = weightData.length;
    const h = input[0].length;
    const w = input[0][0].length;
    const outH = h - kernelSize + 1;
    const outW = w - kernelSize + 1;
    const output = [];

    for (let f = 0; f < outChannels; f++) {
      const fmap = [];
      for (let r = 0; r < outH; r++) {
        const row = [];
        for (let c = 0; c < outW; c++) {
          let sum = biasData[f];
          for (let ch = 0; ch < inChannels; ch++) {
            for (let kr = 0; kr < kernelSize; kr++) {
              for (let kc = 0; kc < kernelSize; kc++) {
                sum += input[ch][r + kr][c + kc] * weightData[f][ch][kr][kc];
              }
            }
          }
          row.push(sum);
        }
        fmap.push(row);
      }
      output.push(fmap);
    }
    return output;
  },

  relu(tensor) {
    return tensor.map(d1 => d1.map(d2 => d2.map(v => Math.max(0, v))));
  },

  maxPool2d(tensor, poolSize) {
    const filters = tensor.length;
    const h = tensor[0].length;
    const w = tensor[0][0].length;
    const outH = Math.floor(h / poolSize);
    const outW = Math.floor(w / poolSize);
    const output = [];

    for (let f = 0; f < filters; f++) {
      const fmap = [];
      for (let r = 0; r < outH; r++) {
        const row = [];
        for (let c = 0; c < outW; c++) {
          let max = -Infinity;
          for (let pr = 0; pr < poolSize; pr++) {
            for (let pc = 0; pc < poolSize; pc++) {
              max = Math.max(max, tensor[f][r * poolSize + pr][c * poolSize + pc]);
            }
          }
          row.push(max);
        }
        fmap.push(row);
      }
      output.push(fmap);
    }
    return output;
  },

  flatten(tensor) {
    const result = [];
    for (let f = 0; f < tensor.length; f++)
      for (let r = 0; r < tensor[f].length; r++)
        for (let c = 0; c < tensor[f][0].length; c++)
          result.push(tensor[f][r][c]);
    return result;
  },

  dense(input, weightData, biasData) {
    const outSize = weightData.length;
    const inSize = weightData[0].length;
    const output = [];
    for (let i = 0; i < outSize; i++) {
      let sum = biasData[i];
      for (let j = 0; j < inSize; j++) {
        sum += input[j] * weightData[i][j];
      }
      output.push(sum);
    }
    return output;
  },

  softmax(logits) {
    const max = Math.max(...logits);
    const exps = logits.map(v => Math.exp(v - max));
    const sum = exps.reduce((a, b) => a + b, 0);
    return exps.map(v => v / sum);
  },

  predict(imgData) {
    const output = this.forward(imgData);
    const result = output.map((p, i) => ({ digit: i, prob: p }));
    result.sort((a, b) => b.prob - a.prob);
    return result;
  },
};
