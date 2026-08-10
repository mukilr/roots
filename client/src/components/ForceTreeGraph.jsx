import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NODE_RADIUS = 26;
const SATELLITE_SCALE = 0.6;
const SATELLITE_OFFSET_X = NODE_RADIUS * 1.35;
const SATELLITE_OFFSET_Y = -NODE_RADIUS * 0.85;
const LEVEL_HEIGHT = 150;
const MARGIN = 80;

function nodeRadius(d) {
  return d.satelliteOf ? NODE_RADIUS * SATELLITE_SCALE : NODE_RADIUS;
}

// A thin 4-point sparkle/twinkle polygon (like a lens-flare star), centered
// on (0, 0) — reads as an actual star far better than a chunky 5-point
// badge shape does.
function starPoints(outerRadius, innerRadius, spikes = 4) {
  const points = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = i * step - Math.PI / 2;
    points.push(`${(r * Math.cos(angle)).toFixed(2)},${(r * Math.sin(angle)).toFixed(2)}`);
  }
  return points.join(' ');
}

// A person's generation is derived from their parents (max(parent gens) + 1)
// or, lacking that, inherited from a spouse whose generation is already
// known — someone who married in shouldn't default to being an "ancestor"
// just because we don't have their parents on file. Only people who never
// resolve either way (true root couples, or a lone person with no links)
// fall back to generation 0. Iterated to a fixed point so it copes with
// data entered in any order, including several disconnected family lines.
function computeGenerations(people) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const generation = new Map();

  // Bootstrap: a person with no parents on file only counts as a true root
  // if their spouse(s) are rootless too (a founding couple). A rootless
  // person married to someone who *does* have parents is presumed to have
  // married in, and picks up the spouse's generation once it resolves below.
  for (const p of people) {
    if (p.parentIds.length !== 0) continue;
    const marriedIntoKnownLine = p.spouseIds.some((sid) => (byId.get(sid)?.parentIds.length ?? 0) > 0);
    if (!marriedIntoKnownLine) generation.set(p.id, 0);
  }

  let changed = true;
  let guard = 0;
  while (changed && guard < people.length + 5) {
    changed = false;
    guard += 1;
    for (const p of people) {
      if (generation.has(p.id)) continue;

      if (p.parentIds.length > 0 && p.parentIds.every((id) => generation.has(id))) {
        const gen = Math.max(...p.parentIds.map((id) => generation.get(id))) + 1;
        generation.set(p.id, gen);
        changed = true;
        continue;
      }

      const knownSpouse = p.spouseIds.find((id) => generation.has(id));
      if (knownSpouse !== undefined) {
        generation.set(p.id, generation.get(knownSpouse));
        changed = true;
      }
    }
  }

  // Anything left (root couples with no parents on file, or isolated people)
  // anchors the tree at generation 0.
  for (const p of people) {
    if (!generation.has(p.id)) generation.set(p.id, 0);
  }

  return generation;
}

// A spouse with no blood lineage of their own (no recorded parents) who
// married into someone who does have one becomes a small "satellite" star —
// it hovers right next to its partner and tracks their position exactly,
// rather than taking an independent place in the generational layout. A
// founding couple (neither has parents on file) stays as two full,
// independent stars.
function computeSpouseSatellites(people) {
  const byId = new Map(people.map((p) => [p.id, p]));
  const satelliteOf = new Map();

  for (const p of people) {
    if (p.parentIds.length > 0) continue;
    if (satelliteOf.has(p.id)) continue;

    const anchorSpouseId = p.spouseIds.find((sid) => {
      const spouse = byId.get(sid);
      return spouse && spouse.parentIds.length > 0 && !satelliteOf.has(sid);
    });

    if (anchorSpouseId) satelliteOf.set(p.id, anchorSpouseId);
  }

  return satelliteOf;
}

function buildGraph(people) {
  const generation = computeGenerations(people);
  const satelliteOf = computeSpouseSatellites(people);
  const maxGeneration = Math.max(0, ...[...generation.values()]);

  const nodes = people.map((p) => ({
    id: p.id,
    firstName: p.firstName,
    lastName: p.lastName,
    gender: p.gender,
    birthDate: p.birthDate,
    deathDate: p.deathDate,
    pending: Boolean(p.pending),
    generation: generation.get(p.id),
    satelliteOf: satelliteOf.get(p.id) || null,
  }));

  const links = [];
  const seenSpousePairs = new Set();
  for (const p of people) {
    for (const childId of p.childrenIds) {
      links.push({ source: p.id, target: childId, type: 'parent' });
    }
    for (const spouseId of p.spouseIds) {
      const key = [p.id, spouseId].sort().join('::');
      if (seenSpousePairs.has(key)) continue;
      seenSpousePairs.add(key);
      links.push({ source: p.id, target: spouseId, type: 'spouse' });
    }
  }

  return { nodes, links, maxGeneration };
}

export function ForceTreeGraph({ people, selectedId, onSelect }) {
  const containerRef = useRef(null);
  const nodeSelById = useRef(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    container.innerHTML = '';
    if (people.length === 0) return undefined;

    const { nodes, links, maxGeneration } = buildGraph(people);
    const nodeById = new Map(nodes.map((d) => [d.id, d]));
    const width = Math.max(container.clientWidth, nodes.length * 90, 800);
    const height = Math.max(container.clientHeight, (maxGeneration + 1) * LEVEL_HEIGHT + MARGIN * 2, 500);

    const targetY = (d) => height - MARGIN - d.generation * LEVEL_HEIGHT;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height]);

    // A fixed starfield backdrop, outside the zoom layer, so the sky stays
    // put while the tree itself pans/zooms above it — like a distant galaxy.
    const starLayer = svg.append('g').attr('class', 'ft-starfield');
    const STAR_COUNT = 160;
    for (let i = 0; i < STAR_COUNT; i++) {
      starLayer
        .append('circle')
        .attr('class', 'ft-star')
        .attr('cx', Math.random() * width)
        .attr('cy', Math.random() * height)
        .attr('r', Math.random() * 1.2 + 0.3)
        .attr('style', `animation-delay: ${(Math.random() * 5).toFixed(2)}s`);
    }

    const zoomLayer = svg.append('g').attr('class', 'zoom-layer');

    const zoom = d3
      .zoom()
      .scaleExtent([0.3, 2.5])
      .on('zoom', (event) => zoomLayer.attr('transform', event.transform));
    svg.call(zoom);

    // Start already panned/zoomed out a touch so a fresh tree isn't cropped.
    svg.call(zoom.transform, d3.zoomIdentity.translate(0, 0).scale(0.9));

    const linkSel = zoomLayer
      .append('g')
      .attr('class', 'ft-graph-links')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('class', (d) => `ft-graph-link ${d.type}`);

    const nodeSel = zoomLayer
      .append('g')
      .attr('class', 'ft-graph-nodes')
      .selectAll('g')
      .data(nodes, (d) => d.id)
      .join('g')
      .attr(
        'class',
        (d) =>
          `ft-graph-node ${d.gender || 'unspecified'}${d.generation === 0 ? ' is-ancestor' : ''}${d.pending ? ' is-pending' : ''}${d.satelliteOf ? ' is-satellite' : ''}`
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelect(d.id);
      });

    // Invisible circle so the whole disc (including the sparkle's concave
    // notches) stays clickable/draggable, not just the painted points.
    nodeSel.append('circle').attr('class', 'ft-graph-node-hit').attr('r', nodeRadius);

    // A soft ambient halo around the bright center...
    nodeSel
      .append('circle')
      .attr('class', 'ft-graph-node-glow')
      .attr('r', (d) => nodeRadius(d) * 0.7);

    // ...thin radiating sparkle points, like a lens-flare star...
    nodeSel
      .append('polygon')
      .attr('class', 'ft-graph-node-sparkle')
      .attr('points', (d) => starPoints(nodeRadius(d), nodeRadius(d) * 0.16))
      .attr('style', () => `animation-delay: ${(Math.random() * 4).toFixed(2)}s`);

    // ...and a small bright disc on top, where the points converge.
    nodeSel
      .append('circle')
      .attr('class', 'ft-graph-node-core')
      .attr('r', (d) => nodeRadius(d) * 0.36);

    // A pulsing "ping" dot marks unsaved nodes — no emoji, just motion.
    const pendingBadge = nodeSel
      .append('g')
      .attr('class', 'ft-graph-pending-badge')
      .attr('transform', (d) => `translate(${nodeRadius(d) - 4}, ${-nodeRadius(d) + 6})`);
    pendingBadge.append('circle').attr('class', 'ft-pending-ping').attr('r', 5);
    pendingBadge.append('circle').attr('class', 'ft-pending-dot').attr('r', 4);

    nodeSel
      .append('text')
      .attr('class', 'ft-graph-name')
      .attr('text-anchor', 'start')
      .attr('x', (d) => nodeRadius(d) + 10)
      .attr('dy', '0.35em')
      .text((d) => d.firstName || 'Unnamed');

    nodeSelById.current = new Map(nodes.map((d, i) => [d.id, nodeSel.nodes()[i]]));

    const drag = d3
      .drag()
      .on('start', (event, d) => {
        if (!event.active) simulation.alphaTarget(0.2).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', (event, d) => {
        d.fx = event.x;
        d.fy = targetY(d); // stay pinned to its generation row while dragging horizontally
      })
      .on('end', (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
      });
    // Satellites don't get their own drag handle — they just follow their
    // partner, so only independent nodes are draggable.
    nodeSel.filter((d) => !d.satelliteOf).call(drag);
    nodeSel.on('dblclick', (event, d) => {
      event.stopPropagation();
      d.fx = null;
      d.fy = null;
      simulation.alphaTarget(0.2).restart();
      setTimeout(() => simulation.alphaTarget(0), 300);
    });

    const simulation = d3
      .forceSimulation(nodes)
      .force(
        'link',
        d3
          .forceLink(links)
          .id((d) => d.id)
          .distance((d) => (d.type === 'spouse' ? 80 : 110))
          .strength((d) => (d.type === 'spouse' ? 0.8 : 0.25))
      )
      .force('charge', d3.forceManyBody().strength((d) => (d.satelliteOf ? -40 : -260)))
      .force(
        'collide',
        d3.forceCollide((d) => (d.satelliteOf ? nodeRadius(d) + 14 : NODE_RADIUS + 40))
      )
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(targetY).strength(1))
      .on('tick', () => {
        // Satellites hover at a fixed offset from their partner and just
        // track them, rather than settling wherever the physics put them.
        for (const d of nodes) {
          if (!d.satelliteOf) continue;
          const primary = nodeById.get(d.satelliteOf);
          if (!primary) continue;
          d.x = primary.x + SATELLITE_OFFSET_X;
          d.y = primary.y + SATELLITE_OFFSET_Y;
          d.vx = 0;
          d.vy = 0;
        }

        nodeSel.attr('transform', (d) => `translate(${d.x},${d.y})`);
        linkSel
          .attr('x1', (d) => d.source.x)
          .attr('y1', (d) => d.source.y)
          .attr('x2', (d) => d.target.x)
          .attr('y2', (d) => d.target.y);
      });

    return () => {
      simulation.stop();
    };
  }, [people, onSelect]);

  useEffect(() => {
    for (const [id, el] of nodeSelById.current) {
      d3.select(el).classed('is-selected', id === selectedId);
    }
  }, [selectedId, people]);

  if (people.length === 0) {
    return <div className="ft-empty">Add a person to get started.</div>;
  }

  return <div className="ft-graph" ref={containerRef} onClick={() => onSelect(null)} />;
}
