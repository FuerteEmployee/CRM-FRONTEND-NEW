import React, { useEffect, useRef, useState, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import { cn } from "@/hrms/lib/utils";
import { buildTimeBreadcrumbs } from "@/hrms/lib/timeBreadcrumbs";

// Time-stamp breadcrumbs only appear once zoomed in this far; MapLibre's
// collision engine auto-thins which ones actually show.
const STAMP_MIN_ZOOM = 13;

// Live marker only repositions once the person has truly moved this far — so a
// stationary phone's GPS jitter never makes the dot wobble while watching live.
// Kept in step with the backend MIN_MOVEMENT_M storage gate.
const LIVE_MARKER_MIN_MOVE_M = 80;
const metersBetween = (lat1: number, lng1: number, lat2: number, lng2: number) => {
  const R = 6371e3, φ1 = (lat1 * Math.PI) / 180, φ2 = (lat2 * Math.PI) / 180;
  const dφ = ((lat2 - lat1) * Math.PI) / 180, dλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(dλ / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/** Branch geofence to draw: the solid circle is the branch radius, the dashed
 *  one is the exit threshold auto punch-out actually uses (radius + buffer). */
export interface GeofenceOverlay {
  lat: number;
  lng: number;
  radiusM: number;
  thresholdM?: number;
  name?: string;
}

/** Where and when an auto punch-out fired, so it can be pinned on the map. */
export interface ExitMarker {
  lat: number;
  lng: number;
  time?: string;      // HH:mm:ss IST
  distanceM?: number; // measured distance from the branch centre
  address?: string;
}

interface Props {
  locations: any[];
  selectedLocation: any | null;
  pathPoints: any[];
  displayPath?: any[];
  stops?: any[];
  showPath: boolean;
  isMapInteractionEnabled: boolean;
  onMarkerClick: (loc: any) => void;
  activePersonnelId: string | null;
  geofence?: GeofenceOverlay | null;
  exitMarker?: ExitMarker | null;
}

// MapLibre has no circle geometry, so approximate one as a polygon. Longitude
// degrees shrink with latitude, hence the cos() correction — without it the
// "circle" is visibly an ellipse away from the equator.
function circleFeature(lat: number, lng: number, radiusM: number, kind: string, steps = 96) {
  const latR = radiusM / 111_320;
  const lngR = radiusM / (111_320 * Math.cos((lat * Math.PI) / 180));
  const ring: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI;
    ring.push([lng + lngR * Math.cos(t), lat + latR * Math.sin(t)]);
  }
  return {
    type: 'Feature' as const,
    properties: { kind },
    geometry: { type: 'Polygon' as const, coordinates: [ring] },
  };
}

// ── Map Style URLs ──────────────────────────────────────────────────────────
const STYLES: Record<string, any> = {
  street: {
    version: 8,
    // Self-hosted glyphs (raster base has none) — same-origin so it also works
    // offline in the Capacitor WebView. Files live in public/fonts/.
    glyphs: '/fonts/{fontstack}/{range}.pbf',
    sources: {
      'google-street': {
        type: 'raster',
        tiles: [
          'https://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
        attribution: '© Google',
        maxzoom: 21,
      }
    },
    layers: [{ id: 'google-street', type: 'raster', source: 'google-street' }]
  },
  satellite: {
    version: 8,
    glyphs: '/fonts/{fontstack}/{range}.pbf',
    sources: {
      'google-sat': {
        type: 'raster',
        // Google satellite — same domain/format as street tiles, works on Android WebView
        tiles: [
          'https://mt0.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
          'https://mt1.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
          'https://mt2.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
          'https://mt3.google.com/vt/lyrs=s&hl=en&x={x}&y={y}&z={z}',
        ],
        tileSize: 256,
        attribution: '© Google',
        maxzoom: 21,
      }
    },
    layers: [{ id: 'google-sat', type: 'raster', source: 'google-sat' }]
  },
};

export const TrackingMap: React.FC<Props> = ({
  locations = [],
  selectedLocation,
  pathPoints = [],
  displayPath = [],
  stops = [],
  showPath,
  isMapInteractionEnabled,
  onMarkerClick,
  activePersonnelId,
  geofence = null,
  exitMarker = null
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const exitMarkerRef = useRef<maplibregl.Marker | null>(null);
  const lastActiveId = useRef<string | null>(null);
  const currentStyleRef = useRef<string>('street');

  const [mapStyle, setMapStyle] = useState<'street' | 'satellite'>('street');
  const [mapReady, setMapReady] = useState(false);
  // Stable ref to the latest updatePathData — lets the map `load` handler call it
  const updatePathDataRef = useRef<() => void>(() => {});

  // ── Initialize Map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: STYLES.street,
      center: [72.8777, 19.076],
      zoom: 10,
      attributionControl: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'bottom-right');
    map.addControl(new maplibregl.FullscreenControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 120 }), 'bottom-left');

    map.on('load', () => {
      setMapReady(true);
      addPathLayers(map);
      setTimeout(() => map.resize(), 100);
      // Re-run with latest pathPoints after React state settles
      setTimeout(() => updatePathDataRef.current(), 300);
    });

    mapRef.current = map;
    (window as any).mapRef = map;

    // Handle container resizing (essential for mobile/flex layouts)
    const resizeObserver = new ResizeObserver(() => {
      map.resize();
    });
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      (window as any).mapRef = null;
      markersRef.current.forEach(m => m.remove());
      markersRef.current.clear();
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Add path source/layers (force re-add after style swap) ──────────────
  const addPathLayers = useCallback((map: maplibregl.Map) => {
    if (!map || !map.isStyleLoaded()) return;
    try {
      ['stamp-labels', 'stamp-dots', 'route-line-stale', 'route-line', 'route-line-border',
       'geofence-fill', 'geofence-outline'].forEach(id => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      if (map.getSource('route-path')) map.removeSource('route-path');
      if (map.getSource('time-stamps')) map.removeSource('time-stamps');
      if (map.getSource('geofence')) map.removeSource('geofence');

      // ── Branch geofence ───────────────────────────────────────────────────
      // Added FIRST so it renders beneath the route: the point of the overlay
      // is to show the path crossing OUT of the circle, which only reads
      // correctly if the line sits on top of the fill.
      map.addSource('geofence', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      map.addLayer({
        id: 'geofence-fill',
        type: 'fill',
        source: 'geofence',
        paint: { 'fill-color': '#10b981', 'fill-opacity': 0.12 },
      });
      map.addLayer({
        id: 'geofence-outline',
        type: 'line',
        source: 'geofence',
        // Dashed for the exit threshold (radius + buffer) so it reads as
        // "the line you actually have to cross", distinct from the branch
        // radius itself.
        paint: {
          'line-color': ['case', ['==', ['get', 'kind'], 'threshold'], '#f59e0b', '#10b981'],
          'line-width': 2,
          'line-dasharray': ['case', ['==', ['get', 'kind'], 'threshold'], ['literal', [2, 2]], ['literal', [1, 0]]] as any,
        },
      });

      map.addSource('route-path', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });

      // White border for contrast on satellite
      map.addLayer({
        id: 'route-line-border',
        type: 'line',
        source: 'route-path',
        paint: { 'line-color': '#ffffff', 'line-width': 8, 'line-opacity': 0.6 },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });

      // Normal (non-stale) route — solid blue
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route-path',
        filter: ['!=', ['get', 'stale'], 1],
        paint: { 'line-color': '#2563eb', 'line-width': 5, 'line-opacity': 1.0 },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });

      // Stale overlay — dashed red on top, filtered by property
      map.addLayer({
        id: 'route-line-stale',
        type: 'line',
        source: 'route-path',
        filter: ['==', ['get', 'stale'], 1],
        paint: {
          'line-color': '#ef4444',
          'line-width': 4,
          'line-opacity': 0.9,
          'line-dasharray': [3, 3],
        },
        layout: { 'line-join': 'round', 'line-cap': 'round' }
      });

      // ── Time-stamp breadcrumbs (zoom-gated, collision-thinned) ──
      map.addSource('time-stamps', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] }
      });
      // Anchor dots — stay visible even when a label is collision-hidden.
      map.addLayer({
        id: 'stamp-dots',
        type: 'circle',
        source: 'time-stamps',
        minzoom: STAMP_MIN_ZOOM,
        paint: {
          'circle-radius': 3,
          'circle-color': '#2563eb',
          'circle-stroke-color': '#ffffff',
          'circle-stroke-width': 1.5,
        }
      });
      // Labels — collision auto-thins; round hours win (lower symbol-sort-key).
      map.addLayer({
        id: 'stamp-labels',
        type: 'symbol',
        source: 'time-stamps',
        minzoom: STAMP_MIN_ZOOM,
        layout: {
          'text-field': ['get', 'time'],
          'text-font': ['Open Sans Regular'],
          'text-size': 11,
          'text-allow-overlap': false,
          'text-ignore-placement': false,
          'symbol-sort-key': ['get', 'priority'],
          'text-offset': [0, 1.1],
        },
        paint: {
          'text-color': '#2563eb',
          'text-halo-color': '#ffffff',
          'text-halo-width': 1.5,
        }
      });
    } catch (e) {
      console.warn('[TrackingMap] addPathLayers error:', e);
    }
  }, []);

  // ── Update path data ────────────────────────────────────────────────────
  const updatePathData = useCallback(() => {
    const map = mapRef.current;
    // Gate on mapReady (React state) so this re-runs when map becomes ready
    if (!map || !mapReady) return;

    if (!map.getSource('route-path')) addPathLayers(map);

    const source = map.getSource('route-path') as maplibregl.GeoJSONSource | undefined;
    if (!source) return;

    const validPts = (pathPoints || []).filter(
      p => p && typeof p.lng === 'number' && typeof p.lat === 'number' && !isNaN(p.lng) && !isNaN(p.lat)
    );
    // Polyline is drawn from the REDUCED display path (raw moving points + one
    // node per dwell) so seated jitter collapses to a dot. Falls back to raw
    // points if the endpoint hasn't supplied displayPath yet.
    const lineSrc = (displayPath && displayPath.length ? displayPath : pathPoints) || [];
    const validLine = lineSrc.filter(
      p => p && typeof p.lng === 'number' && typeof p.lat === 'number' && !isNaN(p.lng) && !isNaN(p.lat)
    );

    if (!showPath || validLine.length < 2) {
      try { source.setData({ type: 'FeatureCollection', features: [] }); } catch (_) {}
      const stampEmpty = map.getSource('time-stamps') as maplibregl.GeoJSONSource | undefined;
      if (stampEmpty) { try { stampEmpty.setData({ type: 'FeatureCollection', features: [] }); } catch (_) {} }
      return;
    }

    try {
      const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
      const now = Date.now();
      const lastTs = validLine[validLine.length - 1].timestamp
        ? new Date(validLine[validLine.length - 1].timestamp).getTime() : 0;
      const tailStale = lastTs > 0 && now - lastTs > TWO_HOURS_MS;

      // Build contiguous segments grouped by stale/normal to produce minimal features
      const features: any[] = [];
      let segCoords: [number, number][] = [[validLine[0].lng, validLine[0].lat]];
      let segStale = false;

      const flush = (stale: boolean) => {
        if (segCoords.length >= 2) {
          features.push({
            type: 'Feature',
            properties: { stale: stale ? 1 : 0 },
            geometry: { type: 'LineString', coordinates: segCoords },
          });
        }
      };

      for (let i = 0; i < validLine.length - 1; i++) {
        const ptA = validLine[i];
        const ptB = validLine[i + 1];
        const tsA = ptA.timestamp ? new Date(ptA.timestamp).getTime() : 0;
        const tsB = ptB.timestamp ? new Date(ptB.timestamp).getTime() : 0;
        const gap = tsA && tsB ? tsB - tsA : 0;
        const isLastSeg = i === validLine.length - 2;
        // A collapsed-dwell node isn't a tracking gap — don't dash segments touching it.
        const stale = !ptA.isStop && !ptB.isStop && (gap > TWO_HOURS_MS || (tailStale && isLastSeg));

        if (stale !== segStale) {
          flush(segStale);
          segCoords = [[ptA.lng, ptA.lat]];
          segStale = stale;
        }
        segCoords.push([ptB.lng, ptB.lat]);
      }
      flush(segStale);

      source.setData({ type: 'FeatureCollection', features });

      // Feed the breadcrumb layer from the SAME points used for the polyline.
      const stampSrc = map.getSource('time-stamps') as maplibregl.GeoJSONSource | undefined;
      if (stampSrc) stampSrc.setData(buildTimeBreadcrumbs(validPts, stops) as any);

      map.triggerRepaint();
    } catch (e) {
      console.warn('[TrackingMap] updatePathData error:', e);
    }
  }, [pathPoints, displayPath, showPath, stops, addPathLayers, mapReady]);

  // Keep ref in sync so the map load handler always calls the latest version
  useEffect(() => { updatePathDataRef.current = updatePathData; }, [updatePathData]);

  useEffect(() => {
    updatePathData();
  }, [updatePathData]);

  // ── Handle Style Changes ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (currentStyleRef.current === mapStyle && mapReady) {
      return;
    }

    currentStyleRef.current = mapStyle;
    const style = STYLES[mapStyle];
    map.setStyle(style);

    const onStyleLoad = () => {
      // Force re-add layers after every style swap
      addPathLayers(map);
      // Re-apply path data with retries to handle async style loading
      updatePathData();
      setTimeout(() => updatePathData(), 200);
      setTimeout(() => updatePathData(), 500);
      setTimeout(() => updatePathData(), 1000);
      setTimeout(() => updatePathData(), 2000);
    };

    map.on('style.load', onStyleLoad);

    return () => { map.off('style.load', onStyleLoad); };
  }, [mapStyle, mapReady, addPathLayers, updatePathData]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Handle interaction enable/disable ───────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (isMapInteractionEnabled) {
      map.dragPan.enable();
      map.scrollZoom.enable();
      map.boxZoom.enable();
      map.doubleClickZoom.enable();
      map.touchZoomRotate.enable();
      map.dragRotate.enable();
    } else {
      map.dragPan.disable();
      map.scrollZoom.disable();
      map.boxZoom.disable();
      map.doubleClickZoom.disable();
      map.touchZoomRotate.disable();
      map.dragRotate.disable();
    }
  }, [isMapInteractionEnabled, mapReady]);



  // ── Zoom-based label visibility ──────────────────────────────────────────
  const zoomRef = useRef<number>(10);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onZoom = () => {
      const z = map.getZoom();
      zoomRef.current = z;
      const show = z >= 12;
      markersRef.current.forEach((marker) => {
        const label = marker.getElement().querySelector('[data-label]') as HTMLElement;
        if (label) label.style.display = show ? 'block' : 'none';
      });
    };
    map.on('zoom', onZoom);
    return () => { map.off('zoom', onZoom); };
  }, [mapReady]);

  // ── Branch geofence overlay ─────────────────────────────────────────────
  // Two rings: the branch radius (solid green) and the exit threshold the
  // auto punch-out logic actually applies (dashed amber, radius + buffer).
  // Showing both answers the question an employee always asks — "I was only
  // just outside, why did it fire?" — because the dashed ring is the real line.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      const src = map.getSource('geofence') as maplibregl.GeoJSONSource | undefined;
      if (!src) return;
      if (!geofence || typeof geofence.lat !== 'number' || typeof geofence.lng !== 'number') {
        try { src.setData({ type: 'FeatureCollection', features: [] }); } catch (_) {}
        return;
      }
      const features: any[] = [circleFeature(geofence.lat, geofence.lng, geofence.radiusM, 'radius')];
      if (geofence.thresholdM && geofence.thresholdM > geofence.radiusM) {
        features.push(circleFeature(geofence.lat, geofence.lng, geofence.thresholdM, 'threshold'));
      }
      try { src.setData({ type: 'FeatureCollection', features }); } catch (_) {}
    };
    if (map.isStyleLoaded()) apply();
    else map.once('idle', apply);
  }, [geofence]);

  // ── Auto punch-out pin ──────────────────────────────────────────────────
  // The exact position the server decided on, labelled with the time and the
  // measured distance — the single thing you point at when explaining why a
  // punch-out happened.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    exitMarkerRef.current?.remove();
    exitMarkerRef.current = null;
    if (!exitMarker || typeof exitMarker.lat !== 'number' || typeof exitMarker.lng !== 'number') return;

    const el = document.createElement('div');
    el.style.cssText = 'display:flex;flex-direction:column;align-items:center;cursor:pointer;';
    el.innerHTML = `
      <div style="background:#dc2626;color:#fff;font:700 10px/1.2 system-ui,sans-serif;
                  padding:4px 7px;border-radius:6px;white-space:nowrap;
                  box-shadow:0 2px 6px rgba(0,0,0,.35);margin-bottom:3px;">
        Auto punch-out${exitMarker.time ? ` · ${exitMarker.time}` : ''}${
          typeof exitMarker.distanceM === 'number' ? ` · ${exitMarker.distanceM}m out` : ''
        }
      </div>
      <svg width="30" height="30" viewBox="0 0 24 24" fill="#dc2626" stroke="#fff" stroke-width="1.5">
        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
        <circle cx="12" cy="9" r="2.5" fill="#fff"/>
      </svg>`;
    if (exitMarker.address) el.title = exitMarker.address;

    exitMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'bottom' })
      .setLngLat([exitMarker.lng, exitMarker.lat])
      .addTo(map);

    // Frame the fence and the exit point together, so the relationship between
    // them is visible without the reviewer having to pan around.
    try {
      const b = new maplibregl.LngLatBounds();
      b.extend([exitMarker.lng, exitMarker.lat]);
      if (geofence) {
        const r = (geofence.thresholdM || geofence.radiusM) / 111_320;
        b.extend([geofence.lng - r, geofence.lat - r]);
        b.extend([geofence.lng + r, geofence.lat + r]);
      }
      map.fitBounds(b, { padding: 80, maxZoom: 17, duration: 600 });
    } catch (_) { /* degenerate bounds */ }

    return () => { exitMarkerRef.current?.remove(); exitMarkerRef.current = null; };
  }, [exitMarker, geofence]);

  // ── Manage Employee Markers ─────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const currentIds = new Set<string>();
    const showLabels = zoomRef.current >= 12;

    (locations || []).forEach(loc => {
      if (!loc) return;
      const lng = loc.location?.lng ?? loc.lng;
      const lat = loc.location?.lat ?? loc.lat;
      if (typeof lng !== 'number' || typeof lat !== 'number' || isNaN(lng) || isNaN(lat)) return;
      if (lng === 0 && lat === 0) return;

      // Strict ID normalization
      const id = String(loc.userId || loc.employeeId || loc.employee?._id || loc._id || '');
      if (!id) return;
      currentIds.add(id);

      const isActive = id === activePersonnelId;
      const trackedAt = loc.trackedAt || loc.timestamp || new Date().toISOString();
      const isLive = (Date.now() - new Date(trackedAt).getTime()) < 10 * 60 * 1000;
      const name = loc.employee?.name || 'Staff';
      const initial = name.split(' ').map((w: string) => w[0]).slice(0, 2).join('').toUpperCase();

      if (markersRef.current.has(id)) {
        const marker = markersRef.current.get(id)!;
        // Only physically move the dot once the person has actually moved — keeps a
        // desk-sitter's marker rock-steady instead of wobbling on GPS jitter. The
        // label/status (live dot, time) still refreshes every poll below.
        const cur = marker.getLngLat();
        if (metersBetween(cur.lat, cur.lng, lat, lng) > LIVE_MARKER_MIN_MOVE_M) {
          marker.setLngLat([lng, lat]);
        }
        const el = marker.getElement();
        updateMarkerElement(el, initial, name, isActive, isLive, trackedAt, showLabels);
      } else {
        const el = createMarkerElement(initial, name, isActive, isLive, trackedAt, showLabels);
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onMarkerClick(loc);
        });
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' })
          .setLngLat([lng, lat])
          .addTo(map);
        markersRef.current.set(id, marker);
      }
    });

    // Remove markers for employees no longer in locations
    const markersToDelete: string[] = [];
    markersRef.current.forEach((marker, id) => {
      if (!currentIds.has(id)) {
        marker.remove();
        markersToDelete.push(id);
      }
    });
    markersToDelete.forEach(id => markersRef.current.delete(id));
  }, [locations, activePersonnelId, mapReady]);

  // ── Auto-center on selection (only when personnel changes) ──────────────
  const hasFittedPath = useRef(false);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const lng = selectedLocation?.location?.lng ?? selectedLocation?.lng;
    const lat = selectedLocation?.location?.lat ?? selectedLocation?.lat;
    const hasPos = typeof lng === 'number' && typeof lat === 'number' && !isNaN(lng) && !isNaN(lat) && !(lng === 0 && lat === 0);

    // Only fly when a NEW person is selected (not on every data update)
    if (activePersonnelId && activePersonnelId !== lastActiveId.current) {
      lastActiveId.current = activePersonnelId;
      hasFittedPath.current = false; // allow one fit for their path
      if (hasPos) {
        map.flyTo({ center: [lng, lat], zoom: 14, duration: 1200 });
      }
    }
  }, [activePersonnelId, selectedLocation, mapReady]);

  // Fit bounds to path ONCE when it first loads for a person
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showPath || hasFittedPath.current) return;
    const valid = (pathPoints || []).filter(p => p && typeof p.lng === 'number' && !isNaN(p.lng) && typeof p.lat === 'number' && !isNaN(p.lat));
    if (valid.length > 1) {
      const bounds = new maplibregl.LngLatBounds();
      valid.forEach(p => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 80, duration: 1000 });
      hasFittedPath.current = true;
    }
  }, [showPath, pathPoints, mapReady]);

  // ── Start / End / Stop markers (no per-point pins) ───────────────────────
  // The full path is drawn as a single polyline (addPathLayers) through EVERY
  // tracked point — that's what carries path fidelity. We only drop markers for
  // the Start, the End, and detected Stops, so dense dwell clusters collapse
  // into ONE labelled stop instead of hundreds of overlapping pins.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    const overlay: maplibregl.Marker[] = [];
    const validPts = (pathPoints || []).filter(
      p => p && typeof p.lng === 'number' && typeof p.lat === 'number' && !isNaN(p.lng) && !isNaN(p.lat)
    );

    if (showPath && validPts.length > 0) {
      const first = validPts[0];
      const last  = validPts[validPts.length - 1];
      const fmt = (t: any) => t
        ? new Date(t).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true })
        : '';

      const pin = (o: { color: string; svg?: string; text?: string; label: string; size?: number }) => {
        const size = o.size ?? 32;
        const el = document.createElement('div');
        el.style.cssText = 'display:flex;flex-direction:column;align-items:center;pointer-events:none;';
        el.innerHTML = `
          <div style="width:${size}px;height:${size}px;background:${o.color};border-radius:50%;
            border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.28);
            display:flex;align-items:center;justify-content:center;">
            ${o.svg ?? `<span style="font-size:11px;font-weight:900;color:white;line-height:1">${o.text ?? ''}</span>`}
          </div>
          <div style="margin-top:2px;background:${o.color};color:white;font-size:9px;font-weight:800;
            padding:2px 8px;border-radius:8px;white-space:nowrap;box-shadow:0 2px 5px rgba(0,0,0,0.22)">${o.label}</div>`;
        return el;
      };

      const startSvg = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>`;
      const endSvg   = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

      // Stops first so Start/End render on top of any overlap.
      (stops || []).forEach((s, idx) => {
        if (typeof s?.lng !== 'number' || typeof s?.lat !== 'number') return;
        const m = s.durationMinutes ?? 0;
        const dur = m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`;
        const el = pin({ color: '#7c3aed', text: String(idx + 1), size: 26, label: `Stop ${idx + 1} · ${dur}` });
        el.style.pointerEvents = 'auto';
        el.style.cursor = 'pointer';
        // Surface the times we already have (same fmt/timezone as Start/End).
        const popup = new maplibregl.Popup({ offset: 24, closeButton: false }).setHTML(
          `<div style="font:600 11px/1.4 system-ui;color:#1e293b">
             <div style="font-weight:800;color:#7c3aed">Stop ${idx + 1}</div>
             <div>Arrived ${fmt(s.arrivalTime)} · Left ${fmt(s.departureTime)}</div>
             <div style="font-weight:700">${dur}</div>
           </div>`
        );
        overlay.push(
          new maplibregl.Marker({ element: el, anchor: 'bottom' })
            .setLngLat([s.lng, s.lat]).setPopup(popup).addTo(map)
        );
      });

      overlay.push(
        new maplibregl.Marker({ element: pin({ color: '#2563eb', svg: startSvg, size: 34, label: `Start · ${fmt(first.timestamp)}` }), anchor: 'bottom' })
          .setLngLat([first.lng, first.lat]).addTo(map)
      );
      overlay.push(
        new maplibregl.Marker({ element: pin({ color: '#16a34a', svg: endSvg, size: 34, label: `End · ${fmt(last.timestamp)}` }), anchor: 'bottom' })
          .setLngLat([last.lng, last.lat]).addTo(map)
      );
    }

    return () => overlay.forEach(m => m.remove());
  }, [showPath, pathPoints, stops, mapReady]);

  return (
    <div className="absolute inset-0 bg-slate-100 overflow-hidden rounded-b-3xl">
      <div ref={containerRef} className="absolute inset-0" />

      {!mapReady && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-2">
            <div className="h-8 w-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Initializing Map...</p>
          </div>
        </div>
      )}

      {/* Map Style Switcher */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap gap-1.5">
        {(['street', 'satellite'] as const).map((style) => (
          <button
            key={style}
            onClick={() => setMapStyle(style)}
            className={cn(
              "px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg border backdrop-blur-md",
              mapStyle === style
                ? "bg-indigo-600 text-white border-indigo-500 ring-2 ring-indigo-300/50"
                : "bg-white/90 text-slate-600 border-slate-200 hover:bg-white hover:shadow-xl"
            )}
          >
            {style}
          </button>
        ))}
      </div>
    </div>
  );
};

// ── Format time helper ────────────────────────────────────────────────────
function formatTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '';
    const now = Date.now();
    const diff = now - d.getTime();
    if (diff < 60_000) return 'Just now';
    if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
    if (diff < 86400_000) {
      return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
    }
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  } catch { return ''; }
}

// ── Marker DOM helpers ────────────────────────────────────────────────────
function createMarkerElement(initial: string, name: string, isActive: boolean, isLive: boolean, trackedAt: string, showLabel: boolean): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = 'cursor:pointer;display:flex;flex-direction:column;align-items:center;';
  updateMarkerElement(el, initial, name, isActive, isLive, trackedAt, showLabel);
  return el;
}

function updateMarkerElement(el: HTMLElement, initial: string, name: string, isActive: boolean, isLive: boolean, trackedAt: string, showLabel: boolean) {
  const time       = formatTime(trackedAt);
  const TWO_H_MS   = 2 * 60 * 60 * 1000;
  const tsMs       = trackedAt ? new Date(trackedAt).getTime() : 0;
  const isStale    = tsMs > 0 && (Date.now() - tsMs) > TWO_H_MS;

  const dotColor   = isLive ? '#22c55e' : isStale ? '#ef4444' : '#94a3b8';
  const liveText   = isLive ? '● Live' : isStale ? '⚠ Stale' : time;
  const textColor  = isLive ? '#16a34a' : isStale ? '#ef4444' : '#94a3b8';
  const borderColor = isActive ? '#4f46e5' : isStale ? '#fca5a5' : '#ffffff';
  const bgColor    = isActive ? '#4f46e5' : '#ffffff';
  const size       = isActive ? 42 : 34;
  const shouldShow = showLabel || isActive;

  el.innerHTML = `
    <div style="
      width:${size}px; height:${size}px;
      border-radius:50%;
      border:3px solid ${borderColor};
      background:${bgColor};
      box-shadow:0 2px 10px rgba(0,0,0,${isActive ? '0.3' : '0.15'});
      display:flex; align-items:center; justify-content:center;
      position:relative;
      z-index:${isActive ? 50 : 10};
    ">
      <span style="font-size:${isActive ? 13 : 11}px;font-weight:800;color:${isActive ? '#fff' : '#475569'};letter-spacing:0.5px;">${initial}</span>
      <div style="
        position:absolute; top:-2px; right:-2px;
        width:10px; height:10px; border-radius:50%;
        border:2px solid white;
        background:${dotColor};
      "></div>
    </div>
    <div data-label style="
      margin-top:4px;
      padding:2px 6px;
      background:${isStale ? '#fef2f2' : 'white'};
      border-radius:6px;
      border:1px solid ${isStale ? '#fca5a5' : '#e2e8f0'};
      box-shadow:0 1px 4px rgba(0,0,0,0.08);
      white-space:nowrap;
      text-align:center;
      pointer-events:none;
      display:${shouldShow ? 'block' : 'none'};
    ">
      <div style="font-size:10px;font-weight:700;color:#1e293b;line-height:1.2;">${name}</div>
      <div style="font-size:8px;font-weight:600;color:${textColor};line-height:1.2;">${liveText}</div>
    </div>
  `;
}
