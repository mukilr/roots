import { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NODE_RADIUS = 26;
const LEVEL_HEIGHT = 150;
const MARGIN = 80;

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

function buildGraph(people) {
  const generation = computeGenerations(people);
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

export function ForceTreeGraph({ people, selectedId, onSelect, focusId, focusNonce }) {
  const containerRef = useRef(null);
  const zoomBehaviorRef = useRef(null);
  const svgRef = useRef(null);
  const nodeSelById = useRef(new Map());

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    container.innerHTML = '';
    if (people.length === 0) return undefined;

    const { nodes, links, maxGeneration } = buildGraph(people);
    const width = Math.max(container.clientWidth, nodes.length * 90, 800);
    const height = Math.max(container.clientHeight, (maxGeneration + 1) * LEVEL_HEIGHT + MARGIN * 2, 500);

    const targetY = (d) => height - MARGIN - d.generation * LEVEL_HEIGHT;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', [0, 0, width, height]);
    svgRef.current = svg;

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
    zoomBehaviorRef.current = zoom;

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
          `ft-graph-node ${d.gender}${d.generation === 0 ? ' is-ancestor' : ''}${d.pending ? ' is-pending' : ''}`
      )
      .on('click', (event, d) => {
        event.stopPropagation();
        onSelect(d.id);
      });

    nodeSel
      .append('circle')
      .attr('class', 'ft-graph-node-glow')
      .attr('r', NODE_RADIUS * 1.8);

    nodeSel
      .append('circle')
      .attr('class', 'ft-graph-node-core')
      .attr('r', NODE_RADIUS)
      .attr('style', () => `animation-delay: ${(Math.random() * 4).toFixed(2)}s`);

    nodeSel
      .append('text')
      .attr('class', 'ft-graph-pending-badge')
      .attr('text-anchor', 'middle')
      .attr('x', NODE_RADIUS - 6)
      .attr('y', -NODE_RADIUS + 10)
      .text('⏳');

    nodeSel
      .append('text')
      .attr('class', 'ft-graph-name')
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 16)
      .text((d) => `${d.firstName} ${d.lastName}`.trim() || 'Unnamed');

    nodeSel
      .append('text')
      .attr('class', 'ft-graph-years')
      .attr('text-anchor', 'middle')
      .attr('dy', NODE_RADIUS + 30)
      .text((d) => {
        const born = d.birthDate?.slice(0, 4);
        const died = d.deathDate?.slice(0, 4);
        if (!born && !died) return '';
        return died ? `${born ?? '?'}–${died}` : `b. ${born}`;
      });

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
    nodeSel.call(drag);
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
      .force('charge', d3.forceManyBody().strength(-260))
      .force('collide', d3.forceCollide(NODE_RADIUS + 26))
      .force('x', d3.forceX(width / 2).strength(0.03))
      .force('y', d3.forceY(targetY).strength(1))
      .on('tick', () => {
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

  useEffect(() => {
    if (!focusId || !svgRef.current || !zoomBehaviorRef.current) return;
    const el = nodeSelById.current.get(focusId);
    if (!el) return;
    const d = d3.select(el).datum();
    const svg = svgRef.current;
    const node = svg.node();
    const { width, height } = node.getBoundingClientRect();
    svg
      .transition()
      .duration(500)
      .call(zoomBehaviorRef.current.transform, d3.zoomIdentity.translate(width / 2 - d.x, height / 2 - d.y).scale(1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, focusNonce]);

  if (people.length === 0) {
    return <div className="ft-empty">Add a person to get started.</div>;
  }

  return <div className="ft-graph" ref={containerRef} onClick={() => onSelect(null)} />;
}
