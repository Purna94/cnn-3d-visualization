const VIS = (function () {
  let scene, camera, renderer, controls;
  const layers = {};
  const edgeLines = {};
  let raycaster, mouse, intersected;
  let highlightBox, highlightMesh;
  let animFrame;

  const LAYER_CONFIG = [
    { id: 'input', name: 'Input Layer',     x: 0,   spacing: 10, dims: [28, 28, 1] },
    { id: 'conv1', name: 'Conv Layer 1',    x: 110, spacing: 9,  dims: [24, 24, 8] },
    { id: 'pool1', name: 'Pool Layer 1',    x: 200, spacing: 12, dims: [12, 12, 8] },
    { id: 'conv2', name: 'Conv Layer 2',    x: 300, spacing: 11, dims: [8, 8, 16] },
    { id: 'pool2', name: 'Pool Layer 2',    x: 390, spacing: 15, dims: [4, 4, 16] },
    { id: 'fc',    name: 'Output Layer',    x: 490, spacing: 20, dims: [10] },
  ];

  const NODE_SIZE = 6;
  const HIDDEN_SIZE = 7;

  function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);

    camera = new THREE.PerspectiveCamera(50, 1, 1, 5000);
    camera.position.set(320, 260, 420);
    camera.lookAt(200, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const container = document.getElementById('webgl-container');
    container.appendChild(renderer.domElement);

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.target.set(200, 0, 0);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.rotateSpeed = 0.8;
    controls.update();

    const ambient = new THREE.AmbientLight(0x404060);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 1);
    dir.position.set(200, 400, 300);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x4488ff, 0.5);
    dir2.position.set(-100, -100, -200);
    scene.add(dir2);
    const dir3 = new THREE.DirectionalLight(0x88ff88, 0.3);
    dir3.position.set(0, -200, 100);
    scene.add(dir3);

    const gridHelper = new THREE.GridHelper(600, 20, 0x333366, 0x222244);
    gridHelper.position.set(200, -180, 0);
    scene.add(gridHelper);

    raycaster = new THREE.Raycaster();
    mouse = new THREE.Vector2();

    highlightBox = new THREE.Mesh(
      new THREE.BoxGeometry(NODE_SIZE + 4, NODE_SIZE + 4, NODE_SIZE + 4),
      new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.4, depthTest: false })
    );
    highlightBox.visible = false;
    scene.add(highlightBox);

    highlightMesh = new THREE.Mesh(
      new THREE.BoxGeometry(NODE_SIZE + 2, NODE_SIZE + 2, NODE_SIZE + 2),
      new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, depthTest: false })
    );
    highlightMesh.visible = false;
    scene.add(highlightMesh);

    renderer.domElement.addEventListener('mousemove', onMouseMove);
    window.addEventListener('resize', onResize);

    buildLayers();
    buildLayerToggles();
    onResize();
    animate();
  }

  function onResize() {
    const container = document.getElementById('webgl-container');
    const w = container.clientWidth;
    const h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  function onMouseMove(e) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function getNodeInfo(id, layerId, index) {
    const cfg = LAYER_CONFIG.find(l => l.id === layerId);
    if (!cfg) return null;
    const info = { layerId, layerName: cfg.name || layerId, index };

    if (layerId === 'input') {
      const row = Math.floor(index / 28);
      const col = index % 28;
      info.row = row; info.col = col;
      info.type = 'Input pixel';
    } else if (layerId === 'conv1' || layerId === 'pool1') {
      const filterIdx = Math.floor(index / (cfg.dims ? cfg.dims[0] * cfg.dims[1] : 1));
      const withinFilter = index % (cfg.dims ? cfg.dims[0] * cfg.dims[1] : 1);
      info.filter = filterIdx;
      if (cfg.dims) {
        info.row = Math.floor(withinFilter / cfg.dims[1]);
        info.col = withinFilter % cfg.dims[1];
      }
      info.type = 'Neuron';
    } else if (layerId === 'conv2' || layerId === 'pool2') {
      const filterIdx = Math.floor(index / (cfg.dims ? cfg.dims[0] * cfg.dims[1] : 1));
      const withinFilter = index % (cfg.dims ? cfg.dims[0] * cfg.dims[1] : 1);
      info.filter = filterIdx;
      if (cfg.dims) {
        info.row = Math.floor(withinFilter / cfg.dims[1]);
        info.col = withinFilter % cfg.dims[1];
      }
      info.type = 'Neuron';
    } else if (layerId === 'fc') {
      info.type = 'Output unit';
      info.row = 0; info.col = index;
    }
    return info;
  }

  function getNodePosition(layerId, filterIdx, row, col, dims) {
    const cfg = LAYER_CONFIG.find(l => l.id === layerId);
    if (!cfg) return { x: 0, y: 0, z: 0 };

    const x = cfg.x;

    if (layerId === 'fc') {
      const total = dims ? dims[0] : 10;
      return {
        x: cfg.x,
        y: (col - (total - 1) / 2) * cfg.spacing,
        z: 0,
      };
    }

    if (!dims) return { x, y: 0, z: 0 };
    const [h, w, filters] = dims;

    let fx, fy;
    if (filters <= 8) {
      fx = filterIdx % 4;
      fy = Math.floor(filterIdx / 4);
    } else {
      fx = filterIdx % 4;
      fy = Math.floor(filterIdx / 4);
    }

    const y = (row - (h - 1) / 2) * cfg.spacing;
    const z = (col - (w - 1) / 2) * cfg.spacing;
    const yOff = (fy - (Math.ceil(filters / 4) - 1) / 2) * h * cfg.spacing * 1.1;
    const zOff = (fx - 1.5) * w * cfg.spacing * 1.1;

    return { x, y: y + yOff, z: z + zOff };
  }

  function buildLayers() {
    LAYER_CONFIG.forEach(cfg => {
      const group = new THREE.Group();
      group.name = cfg.id;
      scene.add(group);
      layers[cfg.id] = { group, meshes: [], positions: [], filterOffsets: [] };
    });
  }

  function updateActivations(layerData, activations) {
    const allPositions = {};
    const allMeshes = [];

    LAYER_CONFIG.forEach(cfg => {
      const dims = cfg.dims;
      if (!dims) return;
      const data = activations ? activations[cfg.id] : null;

      const group = layers[cfg.id].group;
      while (group.children.length) {
        const c = group.children[0];
        c.geometry && c.geometry.dispose();
        c.material && c.material.dispose();
        group.remove(c);
      }

      if (!data) {
        if (cfg.id !== 'input') return;
      }

      if (cfg.id === 'fc') {
        const n = dims[0];
        const positions = [];
        for (let i = 0; i < n; i++) {
          const pos = getNodePosition(cfg.id, 0, 0, i, dims);
          positions.push(pos);
          allPositions[`${cfg.id}:${i}`] = pos;
        }
        const maxN = 10;
        const size = HIDDEN_SIZE;
        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshLambertMaterial();
        const instanced = new THREE.InstancedMesh(geo, mat, n);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();
        const maxAct = activations ? Math.max(...Array.from(data).map(Math.abs), 0.01) : 1;

        for (let i = 0; i < n; i++) {
          dummy.position.set(positions[i].x, positions[i].y, positions[i].z);
          dummy.updateMatrix();
          instanced.setMatrixAt(i, dummy.matrix);
          const val = data ? data[i] : 0;
          const [r, g, b] = colormap.get(val, 0, maxAct);
          color.setRGB(r, g, b);
          instanced.setColorAt(i, color);
        }
        instanced.instanceMatrix.needsUpdate = true;
        instanced.instanceColor.needsUpdate = true;
        instanced.name = cfg.id;
        instanced.userData = { layerId: cfg.id, size, positions };
        group.add(instanced);
        allMeshes.push(instanced);

      } else if (dims.length >= 3) {
        const [h, w, filters] = dims;
        const size = cfg.id.includes('pool') ? NODE_SIZE * 1.1 : NODE_SIZE;
        const total = h * w * filters;
        const positions = [];
        let idx = 0;
        for (let f = 0; f < filters; f++) {
          for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
              const pos = getNodePosition(cfg.id, f, r, c, dims);
              positions.push(pos);
              allPositions[`${cfg.id}:${idx}`] = pos;
              allPositions[`${cfg.id}:f${f}r${r}c${c}`] = pos;
              idx++;
            }
          }
        }

        const geo = new THREE.BoxGeometry(size, size, size);
        const mat = new THREE.MeshLambertMaterial();
        const instanced = new THREE.InstancedMesh(geo, mat, total);
        const dummy = new THREE.Object3D();
        const color = new THREE.Color();

        let maxAct = 1;
        if (data) {
          const flat = data.flat ? data.flat(Infinity) : [];
          maxAct = Math.max(...flat.map(Math.abs), 0.01);
        }

        idx = 0;
        for (let f = 0; f < filters; f++) {
          for (let r = 0; r < h; r++) {
            for (let c = 0; c < w; c++) {
              dummy.position.set(positions[idx].x, positions[idx].y, positions[idx].z);
              dummy.updateMatrix();
              instanced.setMatrixAt(idx, dummy.matrix);
              let val = 0;
              if (data) {
                try { val = data[f][r][c]; } catch(e) { val = 0; }
              }
              const [cr, cg, cb] = colormap.get(val, 0, maxAct);
              color.setRGB(cr, cg, cb);
              instanced.setColorAt(idx, color);
              idx++;
            }
          }
        }
        instanced.instanceMatrix.needsUpdate = true;
        instanced.instanceColor.needsUpdate = true;
        instanced.name = cfg.id;
        instanced.userData = {
          layerId: cfg.id,
          size,
          positions,
          dims,
          h, w, filters,
        };
        group.add(instanced);
        allMeshes.push(instanced);
      }
    });

    buildEdges(allPositions);
    return allPositions;
  }

  function buildEdges(allPositions) {
    Object.values(edgeLines).forEach(line => {
      line.geometry && line.geometry.dispose();
      line.material && line.material.dispose();
      scene.remove(line);
    });

    const connections = [
      { from: 'input', to: 'conv1' },
      { from: 'conv1', to: 'pool1' },
      { from: 'pool1', to: 'conv2' },
      { from: 'conv2', to: 'pool2' },
      { from: 'pool2', to: 'fc' },
    ];

    connections.forEach(conn => {
      const fromPositions = [];
      const toPositions = [];

      Object.entries(allPositions).forEach(([key, pos]) => {
        if (key.startsWith(conn.from + ':')) fromPositions.push(pos);
        if (key.startsWith(conn.to + ':')) toPositions.push(pos);
      });

      if (fromPositions.length === 0 || toPositions.length === 0) return;

      const geom = new THREE.BufferGeometry();
      const verts = [];
      const colors = [];

      const fromStride = Math.max(1, Math.floor(fromPositions.length / toPositions.length));
      const toStride = Math.max(1, Math.floor(toPositions.length / fromPositions.length));

      const count = Math.min(fromPositions.length, toPositions.length);
      const totalLines = Math.min(count, 200);

      for (let i = 0; i < totalLines; i++) {
        const fi = Math.floor(i * fromPositions.length / totalLines);
        const ti = Math.floor(i * toPositions.length / totalLines);
        const fp = fromPositions[fi];
        const tp = toPositions[ti];
        if (!fp || !tp) continue;
        verts.push(fp.x, fp.y, fp.z, tp.x, tp.y, tp.z);
        colors.push(0.2, 0.2, 0.5, 0.3, 0.3, 0.6);
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      geom.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.25,
        depthWrite: false,
      });
      const line = new THREE.LineSegments(geom, mat);
      line.name = `edges:${conn.from}-${conn.to}`;
      scene.add(line);
      edgeLines[`${conn.from}-${conn.to}`] = line;
    });
  }

  function setLayerVisibility(layerId, visible) {
    if (layers[layerId]) {
      layers[layerId].group.visible = visible;
    }
    Object.entries(edgeLines).forEach(([key, line]) => {
      if (key.startsWith(layerId + '-') || key.endsWith('-' + layerId)) {
        line.visible = visible;
      }
    });
  }

  function buildLayerToggles() {
    const container = document.getElementById('layer-toggles');
    container.innerHTML = '';
    LAYER_CONFIG.forEach((cfg, i) => {
      const div = document.createElement('div');
      div.className = 'layer-toggle';
      div.innerHTML = `
        <span class="layer-name">${cfg.name || cfg.id}</span>
        <div class="toggle-switch active" data-layer="${cfg.id}"></div>
      `;
      div.querySelector('.toggle-switch').addEventListener('click', function () {
        this.classList.toggle('active');
        const visible = this.classList.contains('active');
        setLayerVisibility(cfg.id, visible);
      });
      container.appendChild(div);
    });
  }

  function checkIntersection() {
    raycaster.setFromCamera(mouse, camera);

    const meshes = [];
    LAYER_CONFIG.forEach(cfg => {
      const layer = layers[cfg.id];
      if (!layer || !layer.group.visible) return;
      layer.group.children.forEach(child => {
        if (child.isInstancedMesh) meshes.push(child);
      });
    });

    const intersects = raycaster.intersectObjects(meshes);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const mesh = hit.object;
      const instanceId = hit.instanceId;
      const layerId = mesh.userData.layerId;
      const positions = mesh.userData.positions;
      const size = mesh.userData.size || NODE_SIZE;

      if (instanceId !== undefined && positions && positions[instanceId]) {
        const pos = positions[instanceId];

        highlightBox.position.set(pos.x, pos.y, pos.z);
        highlightBox.scale.set(size / NODE_SIZE, size / NODE_SIZE, size / NODE_SIZE);
        highlightBox.visible = true;
        highlightMesh.position.copy(highlightBox.position);
        highlightMesh.scale.copy(highlightBox.scale);
        highlightMesh.visible = true;

        const info = getNodeInfo(instanceId, layerId, instanceId);
        if (info) {
          showInfoPanel(info, layerId, instanceId, mesh);
        }
        return true;
      }
    }

    highlightBox.visible = false;
    highlightMesh.visible = false;
    hideInfoPanel();
    return false;
  }

  function showInfoPanel(info, layerId, index, mesh) {
    const panel = document.getElementById('info-panel');
    panel.classList.add('visible');

    let nodeStr = info.layerName;
    if (info.filter !== undefined) nodeStr += `, filter ${info.filter + 1}`;
    if (info.row !== undefined && info.col !== undefined) {
      if (layerId !== 'fc') nodeStr += `, (${info.row}, ${info.col})`;
    }
    nodeStr += ` #${info.index + 1}`;
    document.getElementById('node-type').textContent = nodeStr;

    const activations = NET.activations;
    let val = null;
    let input = null;
    if (activations && activations[layerId]) {
      const data = activations[layerId];
      if (layerId === 'fc' && Array.isArray(data)) {
        val = data[index];
      } else if (data.length && data[0] && data[0][0] !== undefined) {
        try {
          const h = mesh.userData.h || data[0].length;
          const w = mesh.userData.w || data[0][0].length;
          const f = mesh.userData.filters || data.length;
          const filterIdx = info.filter !== undefined ? info.filter : 0;
          const row = info.row !== undefined ? info.row : 0;
          const col = info.col !== undefined ? info.col : 0;
          val = data[filterIdx]?.[row]?.[col];
        } catch(e) { val = 0; }
      }
    }

    if (val !== null && val !== undefined) {
      document.getElementById('output-val').textContent = val.toFixed(4);
      document.getElementById('output-val').style.color = colormap.getCSS(val, 0);
    } else {
      document.getElementById('output-val').textContent = '—';
    }

    if (layerId === 'fc') {
      document.getElementById('input-val').textContent = '—';
      document.getElementById('calc-val').textContent = 'softmax output';
    } else {
      const calc = layerId === 'pool1' || layerId === 'pool2' ? 'max pooling' : 'ReLU';
      document.getElementById('calc-val').textContent = calc;
      if (layerId === 'input') {
        document.getElementById('input-val').textContent = val !== null ? (val * 255).toFixed(0) : '—';
      } else {
        document.getElementById('input-val').textContent = val !== null ? val.toFixed(4) : '—';
      }
    }
  }

  function hideInfoPanel() {
    document.getElementById('info-panel').classList.remove('visible');
  }

  function animate() {
    animFrame = requestAnimationFrame(animate);
    controls.update();

    if (NET.model) {
      checkIntersection();
    }

    renderer.render(scene, camera);
  }

  function dispose() {
    if (animFrame) cancelAnimationFrame(animFrame);
    if (renderer) {
      renderer.dispose();
      renderer.domElement.remove();
    }
  }

  function getLayerConfig() { return LAYER_CONFIG; }

  return {
    init,
    updateActivations,
    setLayerVisibility,
    getLayerConfig,
    dispose,
  };
})();
