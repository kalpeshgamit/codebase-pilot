import { buildImportGraph } from './imports.js';
import { collectFiles } from '../packer/collector.js';
import { writeFileSync } from 'node:fs';
import { basename } from 'node:path';

export interface GraphData {
  nodes: Array<{ id: string; tokens: number; language: string | null; group: string }>;
  edges: Array<{ source: string; target: string }>;
}

export function buildGraphData(root: string): GraphData {
  const files = collectFiles(root, {});
  const graph = buildImportGraph(root);

  const allImported = new Set<string>();
  for (const deps of graph.values()) {
    for (const dep of deps) {
      allImported.add(dep);
    }
  }

  const nodes = files
    .filter(f => graph.has(f.relativePath) || allImported.has(f.relativePath))
    .map(f => ({
      id: f.relativePath,
      tokens: f.tokens,
      language: f.language,
      group: getGroup(f.relativePath),
    }));

  const nodeIds = new Set(nodes.map(n => n.id));

  const edges: GraphData['edges'] = [];
  for (const [file, deps] of graph) {
    for (const dep of deps) {
      if (nodeIds.has(file) && nodeIds.has(dep)) {
        edges.push({ source: file, target: dep });
      }
    }
  }

  return { nodes, edges };
}

function getGroup(path: string): string {
  const parts = path.split('/');
  if (parts[0] === 'tests') return 'tests';
  if (parts.length >= 2 && parts[0] === 'src') return parts[1];
  return 'other';
}

export function generateVisualization(root: string, outputPath: string): { nodes: number; edges: number } {
  const data = buildGraphData(root);
  const projectName = basename(root);
  const html = buildHtml(projectName, data);
  writeFileSync(outputPath, html, 'utf8');
  return { nodes: data.nodes.length, edges: data.edges.length };
}

function buildHtml(projectName: string, data: GraphData): string {
  const graphJson = JSON.stringify(data);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${projectName} - Import Graph</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }

  body {
    background: #1a1a2e;
    color: #e0e0e0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  #header {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: rgba(16, 16, 36, 0.92);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    padding: 10px 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    height: 52px;
  }

  #header h1 {
    font-size: 15px;
    font-weight: 600;
    color: #fff;
    white-space: nowrap;
  }

  #header .stats {
    font-size: 12px;
    color: #888;
    white-space: nowrap;
  }

  #search-box {
    flex: 1;
    max-width: 320px;
    padding: 6px 12px;
    background: rgba(255, 255, 255, 0.06);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }

  #search-box:focus {
    border-color: rgba(100, 140, 255, 0.5);
  }

  #search-box::placeholder {
    color: #555;
  }

  #legend {
    position: fixed;
    bottom: 16px;
    left: 16px;
    z-index: 100;
    background: rgba(16, 16, 36, 0.92);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 8px;
    padding: 12px 16px;
    font-size: 12px;
    line-height: 1.8;
  }

  #legend .item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  #legend .swatch {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    flex-shrink: 0;
  }

  #tooltip {
    position: fixed;
    pointer-events: none;
    z-index: 200;
    background: rgba(10, 10, 28, 0.95);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 12px;
    line-height: 1.6;
    display: none;
    max-width: 350px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  }

  #tooltip .path {
    font-weight: 600;
    color: #fff;
    word-break: break-all;
    margin-bottom: 4px;
  }

  #tooltip .detail {
    color: #999;
  }

  svg {
    display: block;
  }

  .link {
    stroke: #444;
    stroke-opacity: 0.3;
    fill: none;
  }

  .link.highlighted {
    stroke-opacity: 0.85;
    stroke-width: 2px !important;
  }

  .node circle {
    stroke-width: 1.5;
    cursor: pointer;
    transition: opacity 0.2s;
  }

  .node.dimmed circle {
    opacity: 0.08;
  }

  .node.dimmed text {
    opacity: 0;
  }

  .link.dimmed {
    stroke-opacity: 0.03;
  }

  .node text {
    font-size: 9px;
    fill: #aaa;
    pointer-events: none;
    user-select: none;
  }

  .node.search-match circle {
    stroke: #fff;
    stroke-width: 3;
  }
</style>
</head>
<body>
<div id="header">
  <h1>${projectName}</h1>
  <span class="stats" id="stats"></span>
  <input type="text" id="search-box" placeholder="Search files..." autocomplete="off" spellcheck="false">
</div>
<div id="tooltip">
  <div class="path"></div>
  <div class="detail"></div>
</div>
<div id="legend"></div>
<svg id="graph"></svg>

<script src="https://d3js.org/d3.v7.min.js"><\/script>
<script>
(function() {
  var raw = ${graphJson};

  var COLOR_MAP = {
    cli: '#4a90d9',
    scanner: '#50b87a',
    packer: '#e08a3c',
    security: '#d94a4a',
    registry: '#9b59b6',
    intelligence: '#17a2b8',
    generators: '#d4c84a',
    mcp: '#e06090',
    tests: '#777',
    agents: '#c0a040',
    bin: '#6cb4ee',
    other: '#aaa'
  };

  var GROUP_LABELS = {
    cli: 'src/cli/',
    scanner: 'src/scanner/',
    packer: 'src/packer/',
    security: 'src/security/',
    registry: 'src/registry/',
    intelligence: 'src/intelligence/',
    generators: 'src/generators/',
    mcp: 'src/mcp/',
    tests: 'tests/',
    agents: 'src/agents/',
    bin: 'src/bin/',
    other: 'other'
  };

  // Build legend using DOM methods
  var legendEl = document.getElementById('legend');
  var usedGroups = {};
  raw.nodes.forEach(function(n) { usedGroups[n.group] = true; });

  Object.keys(GROUP_LABELS).forEach(function(group) {
    if (!usedGroups[group]) return;
    var color = COLOR_MAP[group] || COLOR_MAP.other;
    var item = document.createElement('div');
    item.className = 'item';
    var swatch = document.createElement('span');
    swatch.className = 'swatch';
    swatch.style.background = color;
    var label = document.createElement('span');
    label.textContent = GROUP_LABELS[group];
    item.appendChild(swatch);
    item.appendChild(label);
    legendEl.appendChild(item);
  });

  // Stats
  document.getElementById('stats').textContent = raw.nodes.length + ' files, ' + raw.edges.length + ' imports';

  // Prepare data
  var nodes = raw.nodes.map(function(n) {
    return {
      id: n.id,
      tokens: n.tokens,
      language: n.language,
      group: n.group,
      radius: Math.max(4, Math.min(25, Math.sqrt(n.tokens) * 0.3))
    };
  });

  var nodeById = new Map(nodes.map(function(n) { return [n.id, n]; }));

  var links = raw.edges
    .filter(function(e) { return nodeById.has(e.source) && nodeById.has(e.target); })
    .map(function(e) { return { source: e.source, target: e.target }; });

  // Compute adjacency for highlight
  var adjacency = new Map();
  nodes.forEach(function(n) { adjacency.set(n.id, new Set()); });
  links.forEach(function(l) {
    adjacency.get(l.source).add(l.target);
    adjacency.get(l.target).add(l.source);
  });

  // SVG setup
  var width = window.innerWidth;
  var height = window.innerHeight;

  var svg = d3.select('#graph')
    .attr('width', width)
    .attr('height', height);

  // Defs: arrow marker
  svg.append('defs').append('marker')
    .attr('id', 'arrow')
    .attr('viewBox', '0 -4 8 8')
    .attr('refX', 12)
    .attr('refY', 0)
    .attr('markerWidth', 6)
    .attr('markerHeight', 6)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', 'M0,-3L8,0L0,3')
    .attr('fill', '#555');

  var g = svg.append('g');

  // Zoom
  var zoomBehavior = d3.zoom()
    .scaleExtent([0.1, 8])
    .on('zoom', function(event) {
      g.attr('transform', event.transform);
    });

  svg.call(zoomBehavior);

  // Links
  var linkElements = g.append('g')
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('class', 'link')
    .attr('stroke-width', 1)
    .attr('marker-end', 'url(#arrow)');

  // Nodes
  var nodeElements = g.append('g')
    .selectAll('g')
    .data(nodes)
    .join('g')
    .attr('class', 'node');

  nodeElements.append('circle')
    .attr('r', function(d) { return d.radius; })
    .attr('fill', function(d) { return COLOR_MAP[d.group] || COLOR_MAP.other; })
    .attr('stroke', function(d) {
      var c = d3.color(COLOR_MAP[d.group] || COLOR_MAP.other);
      return c ? c.brighter(0.8) : '#fff';
    });

  nodeElements.append('text')
    .attr('dx', function(d) { return d.radius + 3; })
    .attr('dy', 3)
    .text(function(d) {
      var parts = d.id.split('/');
      return parts[parts.length - 1];
    });

  // Tooltip
  var tooltip = document.getElementById('tooltip');
  var tooltipPath = tooltip.querySelector('.path');
  var tooltipDetail = tooltip.querySelector('.detail');

  var selectedNode = null;

  nodeElements
    .on('mouseenter', function(event, d) {
      var deps = adjacency.get(d.id);
      var depCount = deps ? deps.size : 0;

      tooltipPath.textContent = d.id;
      tooltipDetail.textContent = 'Tokens: ' + d.tokens + ' | Language: ' + (d.language || 'unknown') + ' | Connections: ' + depCount;

      tooltip.style.display = 'block';

      if (!selectedNode) {
        highlightConnected(d.id);
      }
    })
    .on('mousemove', function(event) {
      tooltip.style.left = (event.clientX + 14) + 'px';
      tooltip.style.top = (event.clientY - 10) + 'px';
    })
    .on('mouseleave', function() {
      tooltip.style.display = 'none';
      if (!selectedNode) {
        clearHighlight();
      }
    });

  // Click to select
  nodeElements.on('click', function(event, d) {
    event.stopPropagation();
    if (selectedNode === d.id) {
      selectedNode = null;
      clearHighlight();
    } else {
      selectedNode = d.id;
      highlightConnected(d.id);
    }
  });

  svg.on('click', function() {
    selectedNode = null;
    clearHighlight();
  });

  function highlightConnected(nodeId) {
    var connected = adjacency.get(nodeId) || new Set();

    nodeElements.classed('dimmed', function(n) { return n.id !== nodeId && !connected.has(n.id); });
    linkElements
      .classed('dimmed', function(l) { return l.source.id !== nodeId && l.target.id !== nodeId; })
      .classed('highlighted', function(l) { return l.source.id === nodeId || l.target.id === nodeId; });
  }

  function clearHighlight() {
    nodeElements.classed('dimmed', false);
    linkElements.classed('dimmed', false).classed('highlighted', false);
  }

  // Drag
  var drag = d3.drag()
    .on('start', function(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    })
    .on('drag', function(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    })
    .on('end', function(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    });

  nodeElements.call(drag);

  // Simulation
  var simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(function(d) { return d.id; }).distance(80))
    .force('charge', d3.forceManyBody().strength(-200))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .force('collide', d3.forceCollide().radius(function(d) { return d.radius + 4; }))
    .on('tick', function() {
      linkElements
        .attr('x1', function(d) { return d.source.x; })
        .attr('y1', function(d) { return d.source.y; })
        .attr('x2', function(d) { return d.target.x; })
        .attr('y2', function(d) { return d.target.y; });

      nodeElements
        .attr('transform', function(d) { return 'translate(' + d.x + ',' + d.y + ')'; });
    });

  // Search
  var searchBox = document.getElementById('search-box');

  searchBox.addEventListener('input', function() {
    var query = searchBox.value.trim().toLowerCase();
    if (!query) {
      nodeElements.classed('search-match', false);
      if (!selectedNode) clearHighlight();
      return;
    }

    nodeElements.classed('search-match', function(d) { return d.id.toLowerCase().indexOf(query) !== -1; });

    var matches = new Set();
    nodes.forEach(function(d) {
      if (d.id.toLowerCase().indexOf(query) !== -1) matches.add(d.id);
    });

    if (matches.size > 0 && matches.size < nodes.length) {
      var related = new Set(matches);
      matches.forEach(function(m) {
        var adj = adjacency.get(m);
        if (adj) adj.forEach(function(a) { related.add(a); });
      });
      nodeElements.classed('dimmed', function(d) { return !related.has(d.id); });
      linkElements.classed('dimmed', function(l) { return !matches.has(l.source.id) && !matches.has(l.target.id); });
    } else {
      clearHighlight();
    }
  });

  // Resize
  window.addEventListener('resize', function() {
    var w = window.innerWidth;
    var h = window.innerHeight;
    svg.attr('width', w).attr('height', h);
    simulation.force('center', d3.forceCenter(w / 2, h / 2));
    simulation.alpha(0.1).restart();
  });
})();
<\/script>
</body>
</html>`;
}
