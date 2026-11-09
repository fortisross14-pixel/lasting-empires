"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/topojson-client/dist/topojson-client.js
var require_topojson_client = __commonJS({
  "node_modules/topojson-client/dist/topojson-client.js"(exports2, module2) {
    (function(global, factory) {
      typeof exports2 === "object" && typeof module2 !== "undefined" ? factory(exports2) : typeof define === "function" && define.amd ? define(["exports"], factory) : (global = global || self, factory(global.topojson = global.topojson || {}));
    })(exports2, function(exports3) {
      "use strict";
      function identity(x) {
        return x;
      }
      function transform(transform2) {
        if (transform2 == null) return identity;
        var x0, y0, kx = transform2.scale[0], ky = transform2.scale[1], dx = transform2.translate[0], dy = transform2.translate[1];
        return function(input, i) {
          if (!i) x0 = y0 = 0;
          var j = 2, n = input.length, output = new Array(n);
          output[0] = (x0 += input[0]) * kx + dx;
          output[1] = (y0 += input[1]) * ky + dy;
          while (j < n) output[j] = input[j], ++j;
          return output;
        };
      }
      function bbox(topology) {
        var t = transform(topology.transform), key, x0 = Infinity, y0 = x0, x1 = -x0, y1 = -x0;
        function bboxPoint(p) {
          p = t(p);
          if (p[0] < x0) x0 = p[0];
          if (p[0] > x1) x1 = p[0];
          if (p[1] < y0) y0 = p[1];
          if (p[1] > y1) y1 = p[1];
        }
        function bboxGeometry(o) {
          switch (o.type) {
            case "GeometryCollection":
              o.geometries.forEach(bboxGeometry);
              break;
            case "Point":
              bboxPoint(o.coordinates);
              break;
            case "MultiPoint":
              o.coordinates.forEach(bboxPoint);
              break;
          }
        }
        topology.arcs.forEach(function(arc) {
          var i = -1, n = arc.length, p;
          while (++i < n) {
            p = t(arc[i], i);
            if (p[0] < x0) x0 = p[0];
            if (p[0] > x1) x1 = p[0];
            if (p[1] < y0) y0 = p[1];
            if (p[1] > y1) y1 = p[1];
          }
        });
        for (key in topology.objects) {
          bboxGeometry(topology.objects[key]);
        }
        return [x0, y0, x1, y1];
      }
      function reverse(array, n) {
        var t, j = array.length, i = j - n;
        while (i < --j) t = array[i], array[i++] = array[j], array[j] = t;
      }
      function feature2(topology, o) {
        if (typeof o === "string") o = topology.objects[o];
        return o.type === "GeometryCollection" ? { type: "FeatureCollection", features: o.geometries.map(function(o2) {
          return feature$1(topology, o2);
        }) } : feature$1(topology, o);
      }
      function feature$1(topology, o) {
        var id = o.id, bbox2 = o.bbox, properties = o.properties == null ? {} : o.properties, geometry = object(topology, o);
        return id == null && bbox2 == null ? { type: "Feature", properties, geometry } : bbox2 == null ? { type: "Feature", id, properties, geometry } : { type: "Feature", id, bbox: bbox2, properties, geometry };
      }
      function object(topology, o) {
        var transformPoint = transform(topology.transform), arcs = topology.arcs;
        function arc(i, points) {
          if (points.length) points.pop();
          for (var a = arcs[i < 0 ? ~i : i], k = 0, n = a.length; k < n; ++k) {
            points.push(transformPoint(a[k], k));
          }
          if (i < 0) reverse(points, n);
        }
        function point(p) {
          return transformPoint(p);
        }
        function line(arcs2) {
          var points = [];
          for (var i = 0, n = arcs2.length; i < n; ++i) arc(arcs2[i], points);
          if (points.length < 2) points.push(points[0]);
          return points;
        }
        function ring(arcs2) {
          var points = line(arcs2);
          while (points.length < 4) points.push(points[0]);
          return points;
        }
        function polygon(arcs2) {
          return arcs2.map(ring);
        }
        function geometry(o2) {
          var type = o2.type, coordinates;
          switch (type) {
            case "GeometryCollection":
              return { type, geometries: o2.geometries.map(geometry) };
            case "Point":
              coordinates = point(o2.coordinates);
              break;
            case "MultiPoint":
              coordinates = o2.coordinates.map(point);
              break;
            case "LineString":
              coordinates = line(o2.arcs);
              break;
            case "MultiLineString":
              coordinates = o2.arcs.map(line);
              break;
            case "Polygon":
              coordinates = polygon(o2.arcs);
              break;
            case "MultiPolygon":
              coordinates = o2.arcs.map(polygon);
              break;
            default:
              return null;
          }
          return { type, coordinates };
        }
        return geometry(o);
      }
      function stitch(topology, arcs) {
        var stitchedArcs = {}, fragmentByStart = {}, fragmentByEnd = {}, fragments = [], emptyIndex = -1;
        arcs.forEach(function(i, j) {
          var arc = topology.arcs[i < 0 ? ~i : i], t;
          if (arc.length < 3 && !arc[1][0] && !arc[1][1]) {
            t = arcs[++emptyIndex], arcs[emptyIndex] = i, arcs[j] = t;
          }
        });
        arcs.forEach(function(i) {
          var e = ends(i), start = e[0], end = e[1], f, g;
          if (f = fragmentByEnd[start]) {
            delete fragmentByEnd[f.end];
            f.push(i);
            f.end = end;
            if (g = fragmentByStart[end]) {
              delete fragmentByStart[g.start];
              var fg = g === f ? f : f.concat(g);
              fragmentByStart[fg.start = f.start] = fragmentByEnd[fg.end = g.end] = fg;
            } else {
              fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
            }
          } else if (f = fragmentByStart[end]) {
            delete fragmentByStart[f.start];
            f.unshift(i);
            f.start = start;
            if (g = fragmentByEnd[start]) {
              delete fragmentByEnd[g.end];
              var gf = g === f ? f : g.concat(f);
              fragmentByStart[gf.start = g.start] = fragmentByEnd[gf.end = f.end] = gf;
            } else {
              fragmentByStart[f.start] = fragmentByEnd[f.end] = f;
            }
          } else {
            f = [i];
            fragmentByStart[f.start = start] = fragmentByEnd[f.end = end] = f;
          }
        });
        function ends(i) {
          var arc = topology.arcs[i < 0 ? ~i : i], p0 = arc[0], p1;
          if (topology.transform) p1 = [0, 0], arc.forEach(function(dp2) {
            p1[0] += dp2[0], p1[1] += dp2[1];
          });
          else p1 = arc[arc.length - 1];
          return i < 0 ? [p1, p0] : [p0, p1];
        }
        function flush(fragmentByEnd2, fragmentByStart2) {
          for (var k in fragmentByEnd2) {
            var f = fragmentByEnd2[k];
            delete fragmentByStart2[f.start];
            delete f.start;
            delete f.end;
            f.forEach(function(i) {
              stitchedArcs[i < 0 ? ~i : i] = 1;
            });
            fragments.push(f);
          }
        }
        flush(fragmentByEnd, fragmentByStart);
        flush(fragmentByStart, fragmentByEnd);
        arcs.forEach(function(i) {
          if (!stitchedArcs[i < 0 ? ~i : i]) fragments.push([i]);
        });
        return fragments;
      }
      function mesh(topology) {
        return object(topology, meshArcs.apply(this, arguments));
      }
      function meshArcs(topology, object2, filter) {
        var arcs, i, n;
        if (arguments.length > 1) arcs = extractArcs(topology, object2, filter);
        else for (i = 0, arcs = new Array(n = topology.arcs.length); i < n; ++i) arcs[i] = i;
        return { type: "MultiLineString", arcs: stitch(topology, arcs) };
      }
      function extractArcs(topology, object2, filter) {
        var arcs = [], geomsByArc = [], geom;
        function extract0(i) {
          var j = i < 0 ? ~i : i;
          (geomsByArc[j] || (geomsByArc[j] = [])).push({ i, g: geom });
        }
        function extract1(arcs2) {
          arcs2.forEach(extract0);
        }
        function extract2(arcs2) {
          arcs2.forEach(extract1);
        }
        function extract3(arcs2) {
          arcs2.forEach(extract2);
        }
        function geometry(o) {
          switch (geom = o, o.type) {
            case "GeometryCollection":
              o.geometries.forEach(geometry);
              break;
            case "LineString":
              extract1(o.arcs);
              break;
            case "MultiLineString":
            case "Polygon":
              extract2(o.arcs);
              break;
            case "MultiPolygon":
              extract3(o.arcs);
              break;
          }
        }
        geometry(object2);
        geomsByArc.forEach(filter == null ? function(geoms) {
          arcs.push(geoms[0].i);
        } : function(geoms) {
          if (filter(geoms[0].g, geoms[geoms.length - 1].g)) arcs.push(geoms[0].i);
        });
        return arcs;
      }
      function planarRingArea(ring) {
        var i = -1, n = ring.length, a, b = ring[n - 1], area2 = 0;
        while (++i < n) a = b, b = ring[i], area2 += a[0] * b[1] - a[1] * b[0];
        return Math.abs(area2);
      }
      function merge(topology) {
        return object(topology, mergeArcs.apply(this, arguments));
      }
      function mergeArcs(topology, objects) {
        var polygonsByArc = {}, polygons = [], groups = [];
        objects.forEach(geometry);
        function geometry(o) {
          switch (o.type) {
            case "GeometryCollection":
              o.geometries.forEach(geometry);
              break;
            case "Polygon":
              extract(o.arcs);
              break;
            case "MultiPolygon":
              o.arcs.forEach(extract);
              break;
          }
        }
        function extract(polygon) {
          polygon.forEach(function(ring) {
            ring.forEach(function(arc) {
              (polygonsByArc[arc = arc < 0 ? ~arc : arc] || (polygonsByArc[arc] = [])).push(polygon);
            });
          });
          polygons.push(polygon);
        }
        function area2(ring) {
          return planarRingArea(object(topology, { type: "Polygon", arcs: [ring] }).coordinates[0]);
        }
        polygons.forEach(function(polygon) {
          if (!polygon._) {
            var group = [], neighbors2 = [polygon];
            polygon._ = 1;
            groups.push(group);
            while (polygon = neighbors2.pop()) {
              group.push(polygon);
              polygon.forEach(function(ring) {
                ring.forEach(function(arc) {
                  polygonsByArc[arc < 0 ? ~arc : arc].forEach(function(polygon2) {
                    if (!polygon2._) {
                      polygon2._ = 1;
                      neighbors2.push(polygon2);
                    }
                  });
                });
              });
            }
          }
        });
        polygons.forEach(function(polygon) {
          delete polygon._;
        });
        return {
          type: "MultiPolygon",
          arcs: groups.map(function(polygons2) {
            var arcs = [], n;
            polygons2.forEach(function(polygon) {
              polygon.forEach(function(ring) {
                ring.forEach(function(arc) {
                  if (polygonsByArc[arc < 0 ? ~arc : arc].length < 2) {
                    arcs.push(arc);
                  }
                });
              });
            });
            arcs = stitch(topology, arcs);
            if ((n = arcs.length) > 1) {
              for (var i = 1, k = area2(arcs[0]), ki, t; i < n; ++i) {
                if ((ki = area2(arcs[i])) > k) {
                  t = arcs[0], arcs[0] = arcs[i], arcs[i] = t, k = ki;
                }
              }
            }
            return arcs;
          }).filter(function(arcs) {
            return arcs.length > 0;
          })
        };
      }
      function bisect(a, x) {
        var lo = 0, hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (a[mid] < x) lo = mid + 1;
          else hi = mid;
        }
        return lo;
      }
      function neighbors(objects) {
        var indexesByArc = {}, neighbors2 = objects.map(function() {
          return [];
        });
        function line(arcs, i2) {
          arcs.forEach(function(a) {
            if (a < 0) a = ~a;
            var o = indexesByArc[a];
            if (o) o.push(i2);
            else indexesByArc[a] = [i2];
          });
        }
        function polygon(arcs, i2) {
          arcs.forEach(function(arc) {
            line(arc, i2);
          });
        }
        function geometry(o, i2) {
          if (o.type === "GeometryCollection") o.geometries.forEach(function(o2) {
            geometry(o2, i2);
          });
          else if (o.type in geometryType) geometryType[o.type](o.arcs, i2);
        }
        var geometryType = {
          LineString: line,
          MultiLineString: polygon,
          Polygon: polygon,
          MultiPolygon: function(arcs, i2) {
            arcs.forEach(function(arc) {
              polygon(arc, i2);
            });
          }
        };
        objects.forEach(geometry);
        for (var i in indexesByArc) {
          for (var indexes = indexesByArc[i], m = indexes.length, j = 0; j < m; ++j) {
            for (var k = j + 1; k < m; ++k) {
              var ij = indexes[j], ik = indexes[k], n;
              if ((n = neighbors2[ij])[i = bisect(n, ik)] !== ik) n.splice(i, 0, ik);
              if ((n = neighbors2[ik])[i = bisect(n, ij)] !== ij) n.splice(i, 0, ij);
            }
          }
        }
        return neighbors2;
      }
      function untransform(transform2) {
        if (transform2 == null) return identity;
        var x0, y0, kx = transform2.scale[0], ky = transform2.scale[1], dx = transform2.translate[0], dy = transform2.translate[1];
        return function(input, i) {
          if (!i) x0 = y0 = 0;
          var j = 2, n = input.length, output = new Array(n), x1 = Math.round((input[0] - dx) / kx), y1 = Math.round((input[1] - dy) / ky);
          output[0] = x1 - x0, x0 = x1;
          output[1] = y1 - y0, y0 = y1;
          while (j < n) output[j] = input[j], ++j;
          return output;
        };
      }
      function quantize(topology, transform2) {
        if (topology.transform) throw new Error("already quantized");
        if (!transform2 || !transform2.scale) {
          if (!((n = Math.floor(transform2)) >= 2)) throw new Error("n must be \u22652");
          box = topology.bbox || bbox(topology);
          var x0 = box[0], y0 = box[1], x1 = box[2], y1 = box[3], n;
          transform2 = { scale: [x1 - x0 ? (x1 - x0) / (n - 1) : 1, y1 - y0 ? (y1 - y0) / (n - 1) : 1], translate: [x0, y0] };
        } else {
          box = topology.bbox;
        }
        var t = untransform(transform2), box, key, inputs = topology.objects, outputs = {};
        function quantizePoint(point) {
          return t(point);
        }
        function quantizeGeometry(input) {
          var output;
          switch (input.type) {
            case "GeometryCollection":
              output = { type: "GeometryCollection", geometries: input.geometries.map(quantizeGeometry) };
              break;
            case "Point":
              output = { type: "Point", coordinates: quantizePoint(input.coordinates) };
              break;
            case "MultiPoint":
              output = { type: "MultiPoint", coordinates: input.coordinates.map(quantizePoint) };
              break;
            default:
              return input;
          }
          if (input.id != null) output.id = input.id;
          if (input.bbox != null) output.bbox = input.bbox;
          if (input.properties != null) output.properties = input.properties;
          return output;
        }
        function quantizeArc(input) {
          var i = 0, j = 1, n2 = input.length, p, output = new Array(n2);
          output[0] = t(input[0], 0);
          while (++i < n2) if ((p = t(input[i], i))[0] || p[1]) output[j++] = p;
          if (j === 1) output[j++] = [0, 0];
          output.length = j;
          return output;
        }
        for (key in inputs) outputs[key] = quantizeGeometry(inputs[key]);
        return {
          type: "Topology",
          bbox: box,
          transform: transform2,
          objects: outputs,
          arcs: topology.arcs.map(quantizeArc)
        };
      }
      exports3.bbox = bbox;
      exports3.feature = feature2;
      exports3.merge = merge;
      exports3.mergeArcs = mergeArcs;
      exports3.mesh = mesh;
      exports3.meshArcs = meshArcs;
      exports3.neighbors = neighbors;
      exports3.quantize = quantize;
      exports3.transform = transform;
      exports3.untransform = untransform;
      Object.defineProperty(exports3, "__esModule", { value: true });
    });
  }
});

// node_modules/splaytree/dist/splaytree.umd.cjs
var require_splaytree_umd = __commonJS({
  "node_modules/splaytree/dist/splaytree.umd.cjs"(exports2, module2) {
    (function(h, c) {
      typeof exports2 == "object" && typeof module2 < "u" ? module2.exports = c() : typeof define == "function" && define.amd ? define(c) : (h = typeof globalThis < "u" ? globalThis : h || self, h.SplayTree = c());
    })(exports2, function() {
      "use strict";
      class h {
        constructor(t, e) {
          this.next = null, this.key = t, this.data = e, this.left = null, this.right = null;
        }
      }
      function c(n, t) {
        return n > t ? 1 : n < t ? -1 : 0;
      }
      function u4(n, t, e) {
        const r = new h(null, null);
        let i = r, l = r;
        for (; ; ) {
          const o = e(n, t.key);
          if (o < 0) {
            if (t.left === null) break;
            if (e(n, t.left.key) < 0) {
              const s = t.left;
              if (t.left = s.right, s.right = t, t = s, t.left === null) break;
            }
            l.left = t, l = t, t = t.left;
          } else if (o > 0) {
            if (t.right === null) break;
            if (e(n, t.right.key) > 0) {
              const s = t.right;
              if (t.right = s.left, s.left = t, t = s, t.right === null) break;
            }
            i.right = t, i = t, t = t.right;
          } else break;
        }
        return i.right = t.left, l.left = t.right, t.left = r.right, t.right = r.left, t;
      }
      function _(n, t, e, r) {
        const i = new h(n, t);
        if (e === null) return i.left = i.right = null, i;
        e = u4(n, e, r);
        const l = r(n, e.key);
        return l < 0 ? (i.left = e.left, i.right = e, e.left = null) : l >= 0 && (i.right = e.right, i.left = e, e.right = null), i;
      }
      function d(n, t, e) {
        let r = null, i = null;
        if (t) {
          t = u4(n, t, e);
          const l = e(t.key, n);
          l === 0 ? (r = t.left, i = t.right) : l < 0 ? (i = t.right, t.right = null, r = t) : (r = t.left, t.left = null, i = t);
        }
        return { left: r, right: i };
      }
      function w(n, t, e) {
        return t === null ? n : (n === null || (t = u4(n.key, t, e), t.left = n), t);
      }
      function a(n, t, e, r, i) {
        if (n) {
          r(`${t}${e ? "\u2514\u2500\u2500 " : "\u251C\u2500\u2500 "}${i(n)}
`);
          const l = t + (e ? "    " : "\u2502   ");
          n.left && a(n.left, l, false, r, i), n.right && a(n.right, l, true, r, i);
        }
      }
      class x {
        constructor(t = c) {
          this._root = null, this._size = 0, this._comparator = t;
        }
        insert(t, e) {
          return this._size++, this._root = _(t, e, this._root, this._comparator);
        }
        add(t, e) {
          const r = new h(t, e);
          this._root === null && (r.left = r.right = null, this._size++, this._root = r);
          const i = this._comparator, l = u4(t, this._root, i), o = i(t, l.key);
          return o === 0 ? this._root = l : (o < 0 ? (r.left = l.left, r.right = l, l.left = null) : o > 0 && (r.right = l.right, r.left = l, l.right = null), this._size++, this._root = r), this._root;
        }
        remove(t) {
          this._root = this._remove(t, this._root, this._comparator);
        }
        _remove(t, e, r) {
          let i;
          return e === null ? null : (e = u4(t, e, r), r(t, e.key) === 0 ? (e.left === null ? i = e.right : (i = u4(t, e.left, r), i.right = e.right), this._size--, i) : e);
        }
        pop() {
          let t = this._root;
          if (t) {
            for (; t.left; ) t = t.left;
            return this._root = u4(t.key, this._root, this._comparator), this._root = this._remove(t.key, this._root, this._comparator), { key: t.key, data: t.data };
          }
          return null;
        }
        findStatic(t) {
          let e = this._root;
          const r = this._comparator;
          for (; e; ) {
            const i = r(t, e.key);
            if (i === 0) return e;
            i < 0 ? e = e.left : e = e.right;
          }
          return null;
        }
        find(t) {
          return this._root && (this._root = u4(t, this._root, this._comparator), this._comparator(t, this._root.key) !== 0) ? null : this._root;
        }
        contains(t) {
          let e = this._root;
          const r = this._comparator;
          for (; e; ) {
            const i = r(t, e.key);
            if (i === 0) return true;
            i < 0 ? e = e.left : e = e.right;
          }
          return false;
        }
        forEach(t, e) {
          let r = this._root;
          const i = [];
          let l = false;
          for (; !l; ) r !== null ? (i.push(r), r = r.left) : i.length !== 0 ? (r = i.pop(), t.call(e, r), r = r.right) : l = true;
          return this;
        }
        range(t, e, r, i) {
          const l = [], o = this._comparator;
          let s = this._root, f;
          for (; l.length !== 0 || s; ) if (s) l.push(s), s = s.left;
          else {
            if (s = l.pop(), f = o(s.key, e), f > 0) break;
            if (o(s.key, t) >= 0 && r.call(i, s)) return this;
            s = s.right;
          }
          return this;
        }
        keys() {
          const t = [];
          return this.forEach(({ key: e }) => {
            t.push(e);
          }), t;
        }
        values() {
          const t = [];
          return this.forEach(({ data: e }) => {
            t.push(e);
          }), t;
        }
        min() {
          return this._root ? this.minNode(this._root).key : null;
        }
        max() {
          return this._root ? this.maxNode(this._root).key : null;
        }
        minNode(t = this._root) {
          if (t) for (; t.left; ) t = t.left;
          return t;
        }
        maxNode(t = this._root) {
          if (t) for (; t.right; ) t = t.right;
          return t;
        }
        at(t) {
          let e = this._root, r = false, i = 0;
          const l = [];
          for (; !r; ) if (e) l.push(e), e = e.left;
          else if (l.length > 0) {
            if (e = l.pop(), i === t) return e;
            i++, e = e.right;
          } else r = true;
          return null;
        }
        next(t) {
          let e = this._root, r = null;
          if (t.right) {
            for (r = t.right; r.left; ) r = r.left;
            return r;
          }
          const i = this._comparator;
          for (; e; ) {
            const l = i(t.key, e.key);
            if (l === 0) break;
            l < 0 ? (r = e, e = e.left) : e = e.right;
          }
          return r;
        }
        prev(t) {
          let e = this._root, r = null;
          if (t.left !== null) {
            for (r = t.left; r.right; ) r = r.right;
            return r;
          }
          const i = this._comparator;
          for (; e; ) {
            const l = i(t.key, e.key);
            if (l === 0) break;
            l < 0 ? e = e.left : (r = e, e = e.right);
          }
          return r;
        }
        clear() {
          return this._root = null, this._size = 0, this;
        }
        toList() {
          return y(this._root);
        }
        load(t, e = [], r = false) {
          let i = t.length;
          const l = this._comparator;
          if (r && m(t, e, 0, i - 1, l), this._root === null) this._root = p(t, e, 0, i), this._size = i;
          else {
            const o = z(this.toList(), k(t, e), l);
            i = this._size + i, this._root = g({ head: o }, 0, i);
          }
          return this;
        }
        isEmpty() {
          return this._root === null;
        }
        get size() {
          return this._size;
        }
        get root() {
          return this._root;
        }
        toString(t = (e) => String(e.key)) {
          const e = [];
          return a(this._root, "", true, (r) => e.push(r), t), e.join("");
        }
        update(t, e, r) {
          const i = this._comparator;
          let { left: l, right: o } = d(t, this._root, i);
          i(t, e) < 0 ? o = _(e, r, o, i) : l = _(e, r, l, i), this._root = w(l, o, i);
        }
        split(t) {
          return d(t, this._root, this._comparator);
        }
        *[Symbol.iterator]() {
          let t = this._root;
          const e = [];
          let r = false;
          for (; !r; ) t !== null ? (e.push(t), t = t.left) : e.length !== 0 ? (t = e.pop(), yield t, t = t.right) : r = true;
        }
      }
      function p(n, t, e, r) {
        const i = r - e;
        if (i > 0) {
          const l = e + Math.floor(i / 2), o = n[l], s = t[l], f = new h(o, s);
          return f.left = p(n, t, e, l), f.right = p(n, t, l + 1, r), f;
        }
        return null;
      }
      function k(n, t) {
        const e = new h(null, null);
        let r = e;
        for (let i = 0; i < n.length; i++) r = r.next = new h(n[i], t[i]);
        return r.next = null, e.next;
      }
      function y(n) {
        let t = n;
        const e = [];
        let r = false;
        const i = new h(null, null);
        let l = i;
        for (; !r; ) t ? (e.push(t), t = t.left) : e.length > 0 ? (t = l = l.next = e.pop(), t = t.right) : r = true;
        return l.next = null, i.next;
      }
      function g(n, t, e) {
        const r = e - t;
        if (r > 0) {
          const i = t + Math.floor(r / 2), l = g(n, t, i), o = n.head;
          return o.left = l, n.head = n.head.next, o.right = g(n, i + 1, e), o;
        }
        return null;
      }
      function z(n, t, e) {
        const r = new h(null, null);
        let i = r, l = n, o = t;
        for (; l !== null && o !== null; ) e(l.key, o.key) < 0 ? (i.next = l, l = l.next) : (i.next = o, o = o.next), i = i.next;
        return l !== null ? i.next = l : o !== null && (i.next = o), r.next;
      }
      function m(n, t, e, r, i) {
        if (e >= r) return;
        const l = n[e + r >> 1];
        let o = e - 1, s = r + 1;
        for (; ; ) {
          do
            o++;
          while (i(n[o], l) < 0);
          do
            s--;
          while (i(n[s], l) > 0);
          if (o >= s) break;
          let f = n[o];
          n[o] = n[s], n[s] = f, f = t[o], t[o] = t[s], t[s] = f;
        }
        m(n, t, e, s, i), m(n, t, s + 1, r, i);
      }
      return x;
    });
  }
});

// node_modules/polygon-clipping/dist/polygon-clipping.cjs.js
var require_polygon_clipping_cjs = __commonJS({
  "node_modules/polygon-clipping/dist/polygon-clipping.cjs.js"(exports2, module2) {
    "use strict";
    var SplayTree = require_splaytree_umd();
    function _interopDefaultLegacy(e) {
      return e && typeof e === "object" && "default" in e ? e : { "default": e };
    }
    var SplayTree__default = /* @__PURE__ */ _interopDefaultLegacy(SplayTree);
    var isInBbox = (bbox, point) => {
      return bbox.ll.x <= point.x && point.x <= bbox.ur.x && bbox.ll.y <= point.y && point.y <= bbox.ur.y;
    };
    var getBboxOverlap = (b1, b2) => {
      if (b2.ur.x < b1.ll.x || b1.ur.x < b2.ll.x || b2.ur.y < b1.ll.y || b1.ur.y < b2.ll.y) return null;
      const lowerX = b1.ll.x < b2.ll.x ? b2.ll.x : b1.ll.x;
      const upperX = b1.ur.x < b2.ur.x ? b1.ur.x : b2.ur.x;
      const lowerY = b1.ll.y < b2.ll.y ? b2.ll.y : b1.ll.y;
      const upperY = b1.ur.y < b2.ur.y ? b1.ur.y : b2.ur.y;
      return {
        ll: {
          x: lowerX,
          y: lowerY
        },
        ur: {
          x: upperX,
          y: upperY
        }
      };
    };
    var epsilon$1 = Number.EPSILON;
    if (epsilon$1 === void 0) epsilon$1 = Math.pow(2, -52);
    var EPSILON_SQ = epsilon$1 * epsilon$1;
    var cmp = (a, b) => {
      if (-epsilon$1 < a && a < epsilon$1) {
        if (-epsilon$1 < b && b < epsilon$1) {
          return 0;
        }
      }
      const ab4 = a - b;
      if (ab4 * ab4 < EPSILON_SQ * a * b) {
        return 0;
      }
      return a < b ? -1 : 1;
    };
    var PtRounder = class {
      constructor() {
        this.reset();
      }
      reset() {
        this.xRounder = new CoordRounder();
        this.yRounder = new CoordRounder();
      }
      round(x, y) {
        return {
          x: this.xRounder.round(x),
          y: this.yRounder.round(y)
        };
      }
    };
    var CoordRounder = class {
      constructor() {
        this.tree = new SplayTree__default["default"]();
        this.round(0);
      }
      // Note: this can rounds input values backwards or forwards.
      //       You might ask, why not restrict this to just rounding
      //       forwards? Wouldn't that allow left endpoints to always
      //       remain left endpoints during splitting (never change to
      //       right). No - it wouldn't, because we snap intersections
      //       to endpoints (to establish independence from the segment
      //       angle for t-intersections).
      round(coord) {
        const node = this.tree.add(coord);
        const prevNode = this.tree.prev(node);
        if (prevNode !== null && cmp(node.key, prevNode.key) === 0) {
          this.tree.remove(coord);
          return prevNode.key;
        }
        const nextNode = this.tree.next(node);
        if (nextNode !== null && cmp(node.key, nextNode.key) === 0) {
          this.tree.remove(coord);
          return nextNode.key;
        }
        return coord;
      }
    };
    var rounder = new PtRounder();
    var epsilon3 = 11102230246251565e-32;
    var splitter2 = 134217729;
    var resulterrbound2 = (3 + 8 * epsilon3) * epsilon3;
    function sum2(elen, e, flen, f, h) {
      let Q, Qnew, hh, bvirt;
      let enow = e[0];
      let fnow = f[0];
      let eindex = 0;
      let findex = 0;
      if (fnow > enow === fnow > -enow) {
        Q = enow;
        enow = e[++eindex];
      } else {
        Q = fnow;
        fnow = f[++findex];
      }
      let hindex = 0;
      if (eindex < elen && findex < flen) {
        if (fnow > enow === fnow > -enow) {
          Qnew = enow + Q;
          hh = Q - (Qnew - enow);
          enow = e[++eindex];
        } else {
          Qnew = fnow + Q;
          hh = Q - (Qnew - fnow);
          fnow = f[++findex];
        }
        Q = Qnew;
        if (hh !== 0) {
          h[hindex++] = hh;
        }
        while (eindex < elen && findex < flen) {
          if (fnow > enow === fnow > -enow) {
            Qnew = Q + enow;
            bvirt = Qnew - Q;
            hh = Q - (Qnew - bvirt) + (enow - bvirt);
            enow = e[++eindex];
          } else {
            Qnew = Q + fnow;
            bvirt = Qnew - Q;
            hh = Q - (Qnew - bvirt) + (fnow - bvirt);
            fnow = f[++findex];
          }
          Q = Qnew;
          if (hh !== 0) {
            h[hindex++] = hh;
          }
        }
      }
      while (eindex < elen) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
        Q = Qnew;
        if (hh !== 0) {
          h[hindex++] = hh;
        }
      }
      while (findex < flen) {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
        Q = Qnew;
        if (hh !== 0) {
          h[hindex++] = hh;
        }
      }
      if (Q !== 0 || hindex === 0) {
        h[hindex++] = Q;
      }
      return hindex;
    }
    function estimate2(elen, e) {
      let Q = e[0];
      for (let i = 1; i < elen; i++) Q += e[i];
      return Q;
    }
    function vec2(n) {
      return new Float64Array(n);
    }
    var ccwerrboundA2 = (3 + 16 * epsilon3) * epsilon3;
    var ccwerrboundB2 = (2 + 12 * epsilon3) * epsilon3;
    var ccwerrboundC2 = (9 + 64 * epsilon3) * epsilon3 * epsilon3;
    var B2 = vec2(4);
    var C12 = vec2(8);
    var C22 = vec2(12);
    var D2 = vec2(16);
    var u4 = vec2(4);
    function orient2dadapt2(ax, ay, bx, by, cx, cy, detsum) {
      let acxtail, acytail, bcxtail, bcytail;
      let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
      const acx = ax - cx;
      const bcx = bx - cx;
      const acy = ay - cy;
      const bcy = by - cy;
      s1 = acx * bcy;
      c = splitter2 * acx;
      ahi = c - (c - acx);
      alo = acx - ahi;
      c = splitter2 * bcy;
      bhi = c - (c - bcy);
      blo = bcy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = acy * bcx;
      c = splitter2 * acy;
      ahi = c - (c - acy);
      alo = acy - ahi;
      c = splitter2 * bcx;
      bhi = c - (c - bcx);
      blo = bcx - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      B2[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      B2[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      B2[2] = _j - (u32 - bvirt) + (_i - bvirt);
      B2[3] = u32;
      let det = estimate2(4, B2);
      let errbound = ccwerrboundB2 * detsum;
      if (det >= errbound || -det >= errbound) {
        return det;
      }
      bvirt = ax - acx;
      acxtail = ax - (acx + bvirt) + (bvirt - cx);
      bvirt = bx - bcx;
      bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
      bvirt = ay - acy;
      acytail = ay - (acy + bvirt) + (bvirt - cy);
      bvirt = by - bcy;
      bcytail = by - (bcy + bvirt) + (bvirt - cy);
      if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
        return det;
      }
      errbound = ccwerrboundC2 * detsum + resulterrbound2 * Math.abs(det);
      det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
      if (det >= errbound || -det >= errbound) return det;
      s1 = acxtail * bcy;
      c = splitter2 * acxtail;
      ahi = c - (c - acxtail);
      alo = acxtail - ahi;
      c = splitter2 * bcy;
      bhi = c - (c - bcy);
      blo = bcy - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = acytail * bcx;
      c = splitter2 * acytail;
      ahi = c - (c - acytail);
      alo = acytail - ahi;
      c = splitter2 * bcx;
      bhi = c - (c - bcx);
      blo = bcx - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      u4[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      u4[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u4[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u4[3] = u32;
      const C1len = sum2(4, B2, 4, u4, C12);
      s1 = acx * bcytail;
      c = splitter2 * acx;
      ahi = c - (c - acx);
      alo = acx - ahi;
      c = splitter2 * bcytail;
      bhi = c - (c - bcytail);
      blo = bcytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = acy * bcxtail;
      c = splitter2 * acy;
      ahi = c - (c - acy);
      alo = acy - ahi;
      c = splitter2 * bcxtail;
      bhi = c - (c - bcxtail);
      blo = bcxtail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      u4[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      u4[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u4[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u4[3] = u32;
      const C2len = sum2(C1len, C12, 4, u4, C22);
      s1 = acxtail * bcytail;
      c = splitter2 * acxtail;
      ahi = c - (c - acxtail);
      alo = acxtail - ahi;
      c = splitter2 * bcytail;
      bhi = c - (c - bcytail);
      blo = bcytail - bhi;
      s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
      t1 = acytail * bcxtail;
      c = splitter2 * acytail;
      ahi = c - (c - acytail);
      alo = acytail - ahi;
      c = splitter2 * bcxtail;
      bhi = c - (c - bcxtail);
      blo = bcxtail - bhi;
      t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
      _i = s0 - t0;
      bvirt = s0 - _i;
      u4[0] = s0 - (_i + bvirt) + (bvirt - t0);
      _j = s1 + _i;
      bvirt = _j - s1;
      _0 = s1 - (_j - bvirt) + (_i - bvirt);
      _i = _0 - t1;
      bvirt = _0 - _i;
      u4[1] = _0 - (_i + bvirt) + (bvirt - t1);
      u32 = _j + _i;
      bvirt = u32 - _j;
      u4[2] = _j - (u32 - bvirt) + (_i - bvirt);
      u4[3] = u32;
      const Dlen = sum2(C2len, C22, 4, u4, D2);
      return D2[Dlen - 1];
    }
    function orient2d2(ax, ay, bx, by, cx, cy) {
      const detleft = (ay - cy) * (bx - cx);
      const detright = (ax - cx) * (by - cy);
      const det = detleft - detright;
      const detsum = Math.abs(detleft + detright);
      if (Math.abs(det) >= ccwerrboundA2 * detsum) return det;
      return -orient2dadapt2(ax, ay, bx, by, cx, cy, detsum);
    }
    var crossProduct = (a, b) => a.x * b.y - a.y * b.x;
    var dotProduct = (a, b) => a.x * b.x + a.y * b.y;
    var compareVectorAngles = (basePt, endPt1, endPt2) => {
      const res = orient2d2(basePt.x, basePt.y, endPt1.x, endPt1.y, endPt2.x, endPt2.y);
      if (res > 0) return -1;
      if (res < 0) return 1;
      return 0;
    };
    var length = (v2) => Math.sqrt(dotProduct(v2, v2));
    var sineOfAngle = (pShared, pBase, pAngle) => {
      const vBase = {
        x: pBase.x - pShared.x,
        y: pBase.y - pShared.y
      };
      const vAngle = {
        x: pAngle.x - pShared.x,
        y: pAngle.y - pShared.y
      };
      return crossProduct(vAngle, vBase) / length(vAngle) / length(vBase);
    };
    var cosineOfAngle = (pShared, pBase, pAngle) => {
      const vBase = {
        x: pBase.x - pShared.x,
        y: pBase.y - pShared.y
      };
      const vAngle = {
        x: pAngle.x - pShared.x,
        y: pAngle.y - pShared.y
      };
      return dotProduct(vAngle, vBase) / length(vAngle) / length(vBase);
    };
    var horizontalIntersection = (pt, v2, y) => {
      if (v2.y === 0) return null;
      return {
        x: pt.x + v2.x / v2.y * (y - pt.y),
        y
      };
    };
    var verticalIntersection = (pt, v2, x) => {
      if (v2.x === 0) return null;
      return {
        x,
        y: pt.y + v2.y / v2.x * (x - pt.x)
      };
    };
    var intersection$1 = (pt1, v1, pt2, v2) => {
      if (v1.x === 0) return verticalIntersection(pt2, v2, pt1.x);
      if (v2.x === 0) return verticalIntersection(pt1, v1, pt2.x);
      if (v1.y === 0) return horizontalIntersection(pt2, v2, pt1.y);
      if (v2.y === 0) return horizontalIntersection(pt1, v1, pt2.y);
      const kross = crossProduct(v1, v2);
      if (kross == 0) return null;
      const ve = {
        x: pt2.x - pt1.x,
        y: pt2.y - pt1.y
      };
      const d1 = crossProduct(ve, v1) / kross;
      const d2 = crossProduct(ve, v2) / kross;
      const x1 = pt1.x + d2 * v1.x, x2 = pt2.x + d1 * v2.x;
      const y1 = pt1.y + d2 * v1.y, y2 = pt2.y + d1 * v2.y;
      const x = (x1 + x2) / 2;
      const y = (y1 + y2) / 2;
      return {
        x,
        y
      };
    };
    var SweepEvent = class _SweepEvent {
      // for ordering sweep events in the sweep event queue
      static compare(a, b) {
        const ptCmp = _SweepEvent.comparePoints(a.point, b.point);
        if (ptCmp !== 0) return ptCmp;
        if (a.point !== b.point) a.link(b);
        if (a.isLeft !== b.isLeft) return a.isLeft ? 1 : -1;
        return Segment.compare(a.segment, b.segment);
      }
      // for ordering points in sweep line order
      static comparePoints(aPt, bPt) {
        if (aPt.x < bPt.x) return -1;
        if (aPt.x > bPt.x) return 1;
        if (aPt.y < bPt.y) return -1;
        if (aPt.y > bPt.y) return 1;
        return 0;
      }
      // Warning: 'point' input will be modified and re-used (for performance)
      constructor(point, isLeft) {
        if (point.events === void 0) point.events = [this];
        else point.events.push(this);
        this.point = point;
        this.isLeft = isLeft;
      }
      link(other) {
        if (other.point === this.point) {
          throw new Error("Tried to link already linked events");
        }
        const otherEvents = other.point.events;
        for (let i = 0, iMax = otherEvents.length; i < iMax; i++) {
          const evt = otherEvents[i];
          this.point.events.push(evt);
          evt.point = this.point;
        }
        this.checkForConsuming();
      }
      /* Do a pass over our linked events and check to see if any pair
       * of segments match, and should be consumed. */
      checkForConsuming() {
        const numEvents = this.point.events.length;
        for (let i = 0; i < numEvents; i++) {
          const evt1 = this.point.events[i];
          if (evt1.segment.consumedBy !== void 0) continue;
          for (let j = i + 1; j < numEvents; j++) {
            const evt2 = this.point.events[j];
            if (evt2.consumedBy !== void 0) continue;
            if (evt1.otherSE.point.events !== evt2.otherSE.point.events) continue;
            evt1.segment.consume(evt2.segment);
          }
        }
      }
      getAvailableLinkedEvents() {
        const events = [];
        for (let i = 0, iMax = this.point.events.length; i < iMax; i++) {
          const evt = this.point.events[i];
          if (evt !== this && !evt.segment.ringOut && evt.segment.isInResult()) {
            events.push(evt);
          }
        }
        return events;
      }
      /**
       * Returns a comparator function for sorting linked events that will
       * favor the event that will give us the smallest left-side angle.
       * All ring construction starts as low as possible heading to the right,
       * so by always turning left as sharp as possible we'll get polygons
       * without uncessary loops & holes.
       *
       * The comparator function has a compute cache such that it avoids
       * re-computing already-computed values.
       */
      getLeftmostComparator(baseEvent) {
        const cache = /* @__PURE__ */ new Map();
        const fillCache = (linkedEvent) => {
          const nextEvent = linkedEvent.otherSE;
          cache.set(linkedEvent, {
            sine: sineOfAngle(this.point, baseEvent.point, nextEvent.point),
            cosine: cosineOfAngle(this.point, baseEvent.point, nextEvent.point)
          });
        };
        return (a, b) => {
          if (!cache.has(a)) fillCache(a);
          if (!cache.has(b)) fillCache(b);
          const {
            sine: asine,
            cosine: acosine
          } = cache.get(a);
          const {
            sine: bsine,
            cosine: bcosine
          } = cache.get(b);
          if (asine >= 0 && bsine >= 0) {
            if (acosine < bcosine) return 1;
            if (acosine > bcosine) return -1;
            return 0;
          }
          if (asine < 0 && bsine < 0) {
            if (acosine < bcosine) return -1;
            if (acosine > bcosine) return 1;
            return 0;
          }
          if (bsine < asine) return -1;
          if (bsine > asine) return 1;
          return 0;
        };
      }
    };
    var segmentId = 0;
    var Segment = class _Segment {
      /* This compare() function is for ordering segments in the sweep
       * line tree, and does so according to the following criteria:
       *
       * Consider the vertical line that lies an infinestimal step to the
       * right of the right-more of the two left endpoints of the input
       * segments. Imagine slowly moving a point up from negative infinity
       * in the increasing y direction. Which of the two segments will that
       * point intersect first? That segment comes 'before' the other one.
       *
       * If neither segment would be intersected by such a line, (if one
       * or more of the segments are vertical) then the line to be considered
       * is directly on the right-more of the two left inputs.
       */
      static compare(a, b) {
        const alx = a.leftSE.point.x;
        const blx = b.leftSE.point.x;
        const arx = a.rightSE.point.x;
        const brx = b.rightSE.point.x;
        if (brx < alx) return 1;
        if (arx < blx) return -1;
        const aly = a.leftSE.point.y;
        const bly = b.leftSE.point.y;
        const ary = a.rightSE.point.y;
        const bry = b.rightSE.point.y;
        if (alx < blx) {
          if (bly < aly && bly < ary) return 1;
          if (bly > aly && bly > ary) return -1;
          const aCmpBLeft = a.comparePoint(b.leftSE.point);
          if (aCmpBLeft < 0) return 1;
          if (aCmpBLeft > 0) return -1;
          const bCmpARight = b.comparePoint(a.rightSE.point);
          if (bCmpARight !== 0) return bCmpARight;
          return -1;
        }
        if (alx > blx) {
          if (aly < bly && aly < bry) return -1;
          if (aly > bly && aly > bry) return 1;
          const bCmpALeft = b.comparePoint(a.leftSE.point);
          if (bCmpALeft !== 0) return bCmpALeft;
          const aCmpBRight = a.comparePoint(b.rightSE.point);
          if (aCmpBRight < 0) return 1;
          if (aCmpBRight > 0) return -1;
          return 1;
        }
        if (aly < bly) return -1;
        if (aly > bly) return 1;
        if (arx < brx) {
          const bCmpARight = b.comparePoint(a.rightSE.point);
          if (bCmpARight !== 0) return bCmpARight;
        }
        if (arx > brx) {
          const aCmpBRight = a.comparePoint(b.rightSE.point);
          if (aCmpBRight < 0) return 1;
          if (aCmpBRight > 0) return -1;
        }
        if (arx !== brx) {
          const ay = ary - aly;
          const ax = arx - alx;
          const by = bry - bly;
          const bx = brx - blx;
          if (ay > ax && by < bx) return 1;
          if (ay < ax && by > bx) return -1;
        }
        if (arx > brx) return 1;
        if (arx < brx) return -1;
        if (ary < bry) return -1;
        if (ary > bry) return 1;
        if (a.id < b.id) return -1;
        if (a.id > b.id) return 1;
        return 0;
      }
      /* Warning: a reference to ringWindings input will be stored,
       *  and possibly will be later modified */
      constructor(leftSE, rightSE, rings, windings) {
        this.id = ++segmentId;
        this.leftSE = leftSE;
        leftSE.segment = this;
        leftSE.otherSE = rightSE;
        this.rightSE = rightSE;
        rightSE.segment = this;
        rightSE.otherSE = leftSE;
        this.rings = rings;
        this.windings = windings;
      }
      static fromRing(pt1, pt2, ring) {
        let leftPt, rightPt, winding;
        const cmpPts = SweepEvent.comparePoints(pt1, pt2);
        if (cmpPts < 0) {
          leftPt = pt1;
          rightPt = pt2;
          winding = 1;
        } else if (cmpPts > 0) {
          leftPt = pt2;
          rightPt = pt1;
          winding = -1;
        } else throw new Error(`Tried to create degenerate segment at [${pt1.x}, ${pt1.y}]`);
        const leftSE = new SweepEvent(leftPt, true);
        const rightSE = new SweepEvent(rightPt, false);
        return new _Segment(leftSE, rightSE, [ring], [winding]);
      }
      /* When a segment is split, the rightSE is replaced with a new sweep event */
      replaceRightSE(newRightSE) {
        this.rightSE = newRightSE;
        this.rightSE.segment = this;
        this.rightSE.otherSE = this.leftSE;
        this.leftSE.otherSE = this.rightSE;
      }
      bbox() {
        const y1 = this.leftSE.point.y;
        const y2 = this.rightSE.point.y;
        return {
          ll: {
            x: this.leftSE.point.x,
            y: y1 < y2 ? y1 : y2
          },
          ur: {
            x: this.rightSE.point.x,
            y: y1 > y2 ? y1 : y2
          }
        };
      }
      /* A vector from the left point to the right */
      vector() {
        return {
          x: this.rightSE.point.x - this.leftSE.point.x,
          y: this.rightSE.point.y - this.leftSE.point.y
        };
      }
      isAnEndpoint(pt) {
        return pt.x === this.leftSE.point.x && pt.y === this.leftSE.point.y || pt.x === this.rightSE.point.x && pt.y === this.rightSE.point.y;
      }
      /* Compare this segment with a point.
       *
       * A point P is considered to be colinear to a segment if there
       * exists a distance D such that if we travel along the segment
       * from one * endpoint towards the other a distance D, we find
       * ourselves at point P.
       *
       * Return value indicates:
       *
       *   1: point lies above the segment (to the left of vertical)
       *   0: point is colinear to segment
       *  -1: point lies below the segment (to the right of vertical)
       */
      comparePoint(point) {
        if (this.isAnEndpoint(point)) return 0;
        const lPt = this.leftSE.point;
        const rPt = this.rightSE.point;
        const v2 = this.vector();
        if (lPt.x === rPt.x) {
          if (point.x === lPt.x) return 0;
          return point.x < lPt.x ? 1 : -1;
        }
        const yDist = (point.y - lPt.y) / v2.y;
        const xFromYDist = lPt.x + yDist * v2.x;
        if (point.x === xFromYDist) return 0;
        const xDist = (point.x - lPt.x) / v2.x;
        const yFromXDist = lPt.y + xDist * v2.y;
        if (point.y === yFromXDist) return 0;
        return point.y < yFromXDist ? -1 : 1;
      }
      /**
       * Given another segment, returns the first non-trivial intersection
       * between the two segments (in terms of sweep line ordering), if it exists.
       *
       * A 'non-trivial' intersection is one that will cause one or both of the
       * segments to be split(). As such, 'trivial' vs. 'non-trivial' intersection:
       *
       *   * endpoint of segA with endpoint of segB --> trivial
       *   * endpoint of segA with point along segB --> non-trivial
       *   * endpoint of segB with point along segA --> non-trivial
       *   * point along segA with point along segB --> non-trivial
       *
       * If no non-trivial intersection exists, return null
       * Else, return null.
       */
      getIntersection(other) {
        const tBbox = this.bbox();
        const oBbox = other.bbox();
        const bboxOverlap = getBboxOverlap(tBbox, oBbox);
        if (bboxOverlap === null) return null;
        const tlp = this.leftSE.point;
        const trp = this.rightSE.point;
        const olp = other.leftSE.point;
        const orp = other.rightSE.point;
        const touchesOtherLSE = isInBbox(tBbox, olp) && this.comparePoint(olp) === 0;
        const touchesThisLSE = isInBbox(oBbox, tlp) && other.comparePoint(tlp) === 0;
        const touchesOtherRSE = isInBbox(tBbox, orp) && this.comparePoint(orp) === 0;
        const touchesThisRSE = isInBbox(oBbox, trp) && other.comparePoint(trp) === 0;
        if (touchesThisLSE && touchesOtherLSE) {
          if (touchesThisRSE && !touchesOtherRSE) return trp;
          if (!touchesThisRSE && touchesOtherRSE) return orp;
          return null;
        }
        if (touchesThisLSE) {
          if (touchesOtherRSE) {
            if (tlp.x === orp.x && tlp.y === orp.y) return null;
          }
          return tlp;
        }
        if (touchesOtherLSE) {
          if (touchesThisRSE) {
            if (trp.x === olp.x && trp.y === olp.y) return null;
          }
          return olp;
        }
        if (touchesThisRSE && touchesOtherRSE) return null;
        if (touchesThisRSE) return trp;
        if (touchesOtherRSE) return orp;
        const pt = intersection$1(tlp, this.vector(), olp, other.vector());
        if (pt === null) return null;
        if (!isInBbox(bboxOverlap, pt)) return null;
        return rounder.round(pt.x, pt.y);
      }
      /**
       * Split the given segment into multiple segments on the given points.
       *  * Each existing segment will retain its leftSE and a new rightSE will be
       *    generated for it.
       *  * A new segment will be generated which will adopt the original segment's
       *    rightSE, and a new leftSE will be generated for it.
       *  * If there are more than two points given to split on, new segments
       *    in the middle will be generated with new leftSE and rightSE's.
       *  * An array of the newly generated SweepEvents will be returned.
       *
       * Warning: input array of points is modified
       */
      split(point) {
        const newEvents = [];
        const alreadyLinked = point.events !== void 0;
        const newLeftSE = new SweepEvent(point, true);
        const newRightSE = new SweepEvent(point, false);
        const oldRightSE = this.rightSE;
        this.replaceRightSE(newRightSE);
        newEvents.push(newRightSE);
        newEvents.push(newLeftSE);
        const newSeg = new _Segment(newLeftSE, oldRightSE, this.rings.slice(), this.windings.slice());
        if (SweepEvent.comparePoints(newSeg.leftSE.point, newSeg.rightSE.point) > 0) {
          newSeg.swapEvents();
        }
        if (SweepEvent.comparePoints(this.leftSE.point, this.rightSE.point) > 0) {
          this.swapEvents();
        }
        if (alreadyLinked) {
          newLeftSE.checkForConsuming();
          newRightSE.checkForConsuming();
        }
        return newEvents;
      }
      /* Swap which event is left and right */
      swapEvents() {
        const tmpEvt = this.rightSE;
        this.rightSE = this.leftSE;
        this.leftSE = tmpEvt;
        this.leftSE.isLeft = true;
        this.rightSE.isLeft = false;
        for (let i = 0, iMax = this.windings.length; i < iMax; i++) {
          this.windings[i] *= -1;
        }
      }
      /* Consume another segment. We take their rings under our wing
       * and mark them as consumed. Use for perfectly overlapping segments */
      consume(other) {
        let consumer = this;
        let consumee = other;
        while (consumer.consumedBy) consumer = consumer.consumedBy;
        while (consumee.consumedBy) consumee = consumee.consumedBy;
        const cmp2 = _Segment.compare(consumer, consumee);
        if (cmp2 === 0) return;
        if (cmp2 > 0) {
          const tmp = consumer;
          consumer = consumee;
          consumee = tmp;
        }
        if (consumer.prev === consumee) {
          const tmp = consumer;
          consumer = consumee;
          consumee = tmp;
        }
        for (let i = 0, iMax = consumee.rings.length; i < iMax; i++) {
          const ring = consumee.rings[i];
          const winding = consumee.windings[i];
          const index2 = consumer.rings.indexOf(ring);
          if (index2 === -1) {
            consumer.rings.push(ring);
            consumer.windings.push(winding);
          } else consumer.windings[index2] += winding;
        }
        consumee.rings = null;
        consumee.windings = null;
        consumee.consumedBy = consumer;
        consumee.leftSE.consumedBy = consumer.leftSE;
        consumee.rightSE.consumedBy = consumer.rightSE;
      }
      /* The first segment previous segment chain that is in the result */
      prevInResult() {
        if (this._prevInResult !== void 0) return this._prevInResult;
        if (!this.prev) this._prevInResult = null;
        else if (this.prev.isInResult()) this._prevInResult = this.prev;
        else this._prevInResult = this.prev.prevInResult();
        return this._prevInResult;
      }
      beforeState() {
        if (this._beforeState !== void 0) return this._beforeState;
        if (!this.prev) this._beforeState = {
          rings: [],
          windings: [],
          multiPolys: []
        };
        else {
          const seg = this.prev.consumedBy || this.prev;
          this._beforeState = seg.afterState();
        }
        return this._beforeState;
      }
      afterState() {
        if (this._afterState !== void 0) return this._afterState;
        const beforeState = this.beforeState();
        this._afterState = {
          rings: beforeState.rings.slice(0),
          windings: beforeState.windings.slice(0),
          multiPolys: []
        };
        const ringsAfter = this._afterState.rings;
        const windingsAfter = this._afterState.windings;
        const mpsAfter = this._afterState.multiPolys;
        for (let i = 0, iMax = this.rings.length; i < iMax; i++) {
          const ring = this.rings[i];
          const winding = this.windings[i];
          const index2 = ringsAfter.indexOf(ring);
          if (index2 === -1) {
            ringsAfter.push(ring);
            windingsAfter.push(winding);
          } else windingsAfter[index2] += winding;
        }
        const polysAfter = [];
        const polysExclude = [];
        for (let i = 0, iMax = ringsAfter.length; i < iMax; i++) {
          if (windingsAfter[i] === 0) continue;
          const ring = ringsAfter[i];
          const poly = ring.poly;
          if (polysExclude.indexOf(poly) !== -1) continue;
          if (ring.isExterior) polysAfter.push(poly);
          else {
            if (polysExclude.indexOf(poly) === -1) polysExclude.push(poly);
            const index2 = polysAfter.indexOf(ring.poly);
            if (index2 !== -1) polysAfter.splice(index2, 1);
          }
        }
        for (let i = 0, iMax = polysAfter.length; i < iMax; i++) {
          const mp = polysAfter[i].multiPoly;
          if (mpsAfter.indexOf(mp) === -1) mpsAfter.push(mp);
        }
        return this._afterState;
      }
      /* Is this segment part of the final result? */
      isInResult() {
        if (this.consumedBy) return false;
        if (this._isInResult !== void 0) return this._isInResult;
        const mpsBefore = this.beforeState().multiPolys;
        const mpsAfter = this.afterState().multiPolys;
        switch (operation.type) {
          case "union": {
            const noBefores = mpsBefore.length === 0;
            const noAfters = mpsAfter.length === 0;
            this._isInResult = noBefores !== noAfters;
            break;
          }
          case "intersection": {
            let least;
            let most;
            if (mpsBefore.length < mpsAfter.length) {
              least = mpsBefore.length;
              most = mpsAfter.length;
            } else {
              least = mpsAfter.length;
              most = mpsBefore.length;
            }
            this._isInResult = most === operation.numMultiPolys && least < most;
            break;
          }
          case "xor": {
            const diff = Math.abs(mpsBefore.length - mpsAfter.length);
            this._isInResult = diff % 2 === 1;
            break;
          }
          case "difference": {
            const isJustSubject = (mps) => mps.length === 1 && mps[0].isSubject;
            this._isInResult = isJustSubject(mpsBefore) !== isJustSubject(mpsAfter);
            break;
          }
          default:
            throw new Error(`Unrecognized operation type found ${operation.type}`);
        }
        return this._isInResult;
      }
    };
    var RingIn = class {
      constructor(geomRing, poly, isExterior) {
        if (!Array.isArray(geomRing) || geomRing.length === 0) {
          throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
        }
        this.poly = poly;
        this.isExterior = isExterior;
        this.segments = [];
        if (typeof geomRing[0][0] !== "number" || typeof geomRing[0][1] !== "number") {
          throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
        }
        const firstPoint = rounder.round(geomRing[0][0], geomRing[0][1]);
        this.bbox = {
          ll: {
            x: firstPoint.x,
            y: firstPoint.y
          },
          ur: {
            x: firstPoint.x,
            y: firstPoint.y
          }
        };
        let prevPoint = firstPoint;
        for (let i = 1, iMax = geomRing.length; i < iMax; i++) {
          if (typeof geomRing[i][0] !== "number" || typeof geomRing[i][1] !== "number") {
            throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
          }
          let point = rounder.round(geomRing[i][0], geomRing[i][1]);
          if (point.x === prevPoint.x && point.y === prevPoint.y) continue;
          this.segments.push(Segment.fromRing(prevPoint, point, this));
          if (point.x < this.bbox.ll.x) this.bbox.ll.x = point.x;
          if (point.y < this.bbox.ll.y) this.bbox.ll.y = point.y;
          if (point.x > this.bbox.ur.x) this.bbox.ur.x = point.x;
          if (point.y > this.bbox.ur.y) this.bbox.ur.y = point.y;
          prevPoint = point;
        }
        if (firstPoint.x !== prevPoint.x || firstPoint.y !== prevPoint.y) {
          this.segments.push(Segment.fromRing(prevPoint, firstPoint, this));
        }
      }
      getSweepEvents() {
        const sweepEvents = [];
        for (let i = 0, iMax = this.segments.length; i < iMax; i++) {
          const segment = this.segments[i];
          sweepEvents.push(segment.leftSE);
          sweepEvents.push(segment.rightSE);
        }
        return sweepEvents;
      }
    };
    var PolyIn = class {
      constructor(geomPoly, multiPoly) {
        if (!Array.isArray(geomPoly)) {
          throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
        }
        this.exteriorRing = new RingIn(geomPoly[0], this, true);
        this.bbox = {
          ll: {
            x: this.exteriorRing.bbox.ll.x,
            y: this.exteriorRing.bbox.ll.y
          },
          ur: {
            x: this.exteriorRing.bbox.ur.x,
            y: this.exteriorRing.bbox.ur.y
          }
        };
        this.interiorRings = [];
        for (let i = 1, iMax = geomPoly.length; i < iMax; i++) {
          const ring = new RingIn(geomPoly[i], this, false);
          if (ring.bbox.ll.x < this.bbox.ll.x) this.bbox.ll.x = ring.bbox.ll.x;
          if (ring.bbox.ll.y < this.bbox.ll.y) this.bbox.ll.y = ring.bbox.ll.y;
          if (ring.bbox.ur.x > this.bbox.ur.x) this.bbox.ur.x = ring.bbox.ur.x;
          if (ring.bbox.ur.y > this.bbox.ur.y) this.bbox.ur.y = ring.bbox.ur.y;
          this.interiorRings.push(ring);
        }
        this.multiPoly = multiPoly;
      }
      getSweepEvents() {
        const sweepEvents = this.exteriorRing.getSweepEvents();
        for (let i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
          const ringSweepEvents = this.interiorRings[i].getSweepEvents();
          for (let j = 0, jMax = ringSweepEvents.length; j < jMax; j++) {
            sweepEvents.push(ringSweepEvents[j]);
          }
        }
        return sweepEvents;
      }
    };
    var MultiPolyIn = class {
      constructor(geom, isSubject) {
        if (!Array.isArray(geom)) {
          throw new Error("Input geometry is not a valid Polygon or MultiPolygon");
        }
        try {
          if (typeof geom[0][0][0] === "number") geom = [geom];
        } catch (ex) {
        }
        this.polys = [];
        this.bbox = {
          ll: {
            x: Number.POSITIVE_INFINITY,
            y: Number.POSITIVE_INFINITY
          },
          ur: {
            x: Number.NEGATIVE_INFINITY,
            y: Number.NEGATIVE_INFINITY
          }
        };
        for (let i = 0, iMax = geom.length; i < iMax; i++) {
          const poly = new PolyIn(geom[i], this);
          if (poly.bbox.ll.x < this.bbox.ll.x) this.bbox.ll.x = poly.bbox.ll.x;
          if (poly.bbox.ll.y < this.bbox.ll.y) this.bbox.ll.y = poly.bbox.ll.y;
          if (poly.bbox.ur.x > this.bbox.ur.x) this.bbox.ur.x = poly.bbox.ur.x;
          if (poly.bbox.ur.y > this.bbox.ur.y) this.bbox.ur.y = poly.bbox.ur.y;
          this.polys.push(poly);
        }
        this.isSubject = isSubject;
      }
      getSweepEvents() {
        const sweepEvents = [];
        for (let i = 0, iMax = this.polys.length; i < iMax; i++) {
          const polySweepEvents = this.polys[i].getSweepEvents();
          for (let j = 0, jMax = polySweepEvents.length; j < jMax; j++) {
            sweepEvents.push(polySweepEvents[j]);
          }
        }
        return sweepEvents;
      }
    };
    var RingOut = class _RingOut {
      /* Given the segments from the sweep line pass, compute & return a series
       * of closed rings from all the segments marked to be part of the result */
      static factory(allSegments) {
        const ringsOut = [];
        for (let i = 0, iMax = allSegments.length; i < iMax; i++) {
          const segment = allSegments[i];
          if (!segment.isInResult() || segment.ringOut) continue;
          let prevEvent = null;
          let event = segment.leftSE;
          let nextEvent = segment.rightSE;
          const events = [event];
          const startingPoint = event.point;
          const intersectionLEs = [];
          while (true) {
            prevEvent = event;
            event = nextEvent;
            events.push(event);
            if (event.point === startingPoint) break;
            while (true) {
              const availableLEs = event.getAvailableLinkedEvents();
              if (availableLEs.length === 0) {
                const firstPt = events[0].point;
                const lastPt = events[events.length - 1].point;
                throw new Error(`Unable to complete output ring starting at [${firstPt.x}, ${firstPt.y}]. Last matching segment found ends at [${lastPt.x}, ${lastPt.y}].`);
              }
              if (availableLEs.length === 1) {
                nextEvent = availableLEs[0].otherSE;
                break;
              }
              let indexLE = null;
              for (let j = 0, jMax = intersectionLEs.length; j < jMax; j++) {
                if (intersectionLEs[j].point === event.point) {
                  indexLE = j;
                  break;
                }
              }
              if (indexLE !== null) {
                const intersectionLE = intersectionLEs.splice(indexLE)[0];
                const ringEvents = events.splice(intersectionLE.index);
                ringEvents.unshift(ringEvents[0].otherSE);
                ringsOut.push(new _RingOut(ringEvents.reverse()));
                continue;
              }
              intersectionLEs.push({
                index: events.length,
                point: event.point
              });
              const comparator = event.getLeftmostComparator(prevEvent);
              nextEvent = availableLEs.sort(comparator)[0].otherSE;
              break;
            }
          }
          ringsOut.push(new _RingOut(events));
        }
        return ringsOut;
      }
      constructor(events) {
        this.events = events;
        for (let i = 0, iMax = events.length; i < iMax; i++) {
          events[i].segment.ringOut = this;
        }
        this.poly = null;
      }
      getGeom() {
        let prevPt = this.events[0].point;
        const points = [prevPt];
        for (let i = 1, iMax = this.events.length - 1; i < iMax; i++) {
          const pt2 = this.events[i].point;
          const nextPt2 = this.events[i + 1].point;
          if (compareVectorAngles(pt2, prevPt, nextPt2) === 0) continue;
          points.push(pt2);
          prevPt = pt2;
        }
        if (points.length === 1) return null;
        const pt = points[0];
        const nextPt = points[1];
        if (compareVectorAngles(pt, prevPt, nextPt) === 0) points.shift();
        points.push(points[0]);
        const step = this.isExteriorRing() ? 1 : -1;
        const iStart = this.isExteriorRing() ? 0 : points.length - 1;
        const iEnd = this.isExteriorRing() ? points.length : -1;
        const orderedPoints = [];
        for (let i = iStart; i != iEnd; i += step) orderedPoints.push([points[i].x, points[i].y]);
        return orderedPoints;
      }
      isExteriorRing() {
        if (this._isExteriorRing === void 0) {
          const enclosing = this.enclosingRing();
          this._isExteriorRing = enclosing ? !enclosing.isExteriorRing() : true;
        }
        return this._isExteriorRing;
      }
      enclosingRing() {
        if (this._enclosingRing === void 0) {
          this._enclosingRing = this._calcEnclosingRing();
        }
        return this._enclosingRing;
      }
      /* Returns the ring that encloses this one, if any */
      _calcEnclosingRing() {
        let leftMostEvt = this.events[0];
        for (let i = 1, iMax = this.events.length; i < iMax; i++) {
          const evt = this.events[i];
          if (SweepEvent.compare(leftMostEvt, evt) > 0) leftMostEvt = evt;
        }
        let prevSeg = leftMostEvt.segment.prevInResult();
        let prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
        while (true) {
          if (!prevSeg) return null;
          if (!prevPrevSeg) return prevSeg.ringOut;
          if (prevPrevSeg.ringOut !== prevSeg.ringOut) {
            if (prevPrevSeg.ringOut.enclosingRing() !== prevSeg.ringOut) {
              return prevSeg.ringOut;
            } else return prevSeg.ringOut.enclosingRing();
          }
          prevSeg = prevPrevSeg.prevInResult();
          prevPrevSeg = prevSeg ? prevSeg.prevInResult() : null;
        }
      }
    };
    var PolyOut = class {
      constructor(exteriorRing) {
        this.exteriorRing = exteriorRing;
        exteriorRing.poly = this;
        this.interiorRings = [];
      }
      addInterior(ring) {
        this.interiorRings.push(ring);
        ring.poly = this;
      }
      getGeom() {
        const geom = [this.exteriorRing.getGeom()];
        if (geom[0] === null) return null;
        for (let i = 0, iMax = this.interiorRings.length; i < iMax; i++) {
          const ringGeom = this.interiorRings[i].getGeom();
          if (ringGeom === null) continue;
          geom.push(ringGeom);
        }
        return geom;
      }
    };
    var MultiPolyOut = class {
      constructor(rings) {
        this.rings = rings;
        this.polys = this._composePolys(rings);
      }
      getGeom() {
        const geom = [];
        for (let i = 0, iMax = this.polys.length; i < iMax; i++) {
          const polyGeom = this.polys[i].getGeom();
          if (polyGeom === null) continue;
          geom.push(polyGeom);
        }
        return geom;
      }
      _composePolys(rings) {
        const polys2 = [];
        for (let i = 0, iMax = rings.length; i < iMax; i++) {
          const ring = rings[i];
          if (ring.poly) continue;
          if (ring.isExteriorRing()) polys2.push(new PolyOut(ring));
          else {
            const enclosingRing = ring.enclosingRing();
            if (!enclosingRing.poly) polys2.push(new PolyOut(enclosingRing));
            enclosingRing.poly.addInterior(ring);
          }
        }
        return polys2;
      }
    };
    var SweepLine = class {
      constructor(queue) {
        let comparator = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : Segment.compare;
        this.queue = queue;
        this.tree = new SplayTree__default["default"](comparator);
        this.segments = [];
      }
      process(event) {
        const segment = event.segment;
        const newEvents = [];
        if (event.consumedBy) {
          if (event.isLeft) this.queue.remove(event.otherSE);
          else this.tree.remove(segment);
          return newEvents;
        }
        const node = event.isLeft ? this.tree.add(segment) : this.tree.find(segment);
        if (!node) throw new Error(`Unable to find segment #${segment.id} [${segment.leftSE.point.x}, ${segment.leftSE.point.y}] -> [${segment.rightSE.point.x}, ${segment.rightSE.point.y}] in SweepLine tree.`);
        let prevNode = node;
        let nextNode = node;
        let prevSeg = void 0;
        let nextSeg = void 0;
        while (prevSeg === void 0) {
          prevNode = this.tree.prev(prevNode);
          if (prevNode === null) prevSeg = null;
          else if (prevNode.key.consumedBy === void 0) prevSeg = prevNode.key;
        }
        while (nextSeg === void 0) {
          nextNode = this.tree.next(nextNode);
          if (nextNode === null) nextSeg = null;
          else if (nextNode.key.consumedBy === void 0) nextSeg = nextNode.key;
        }
        if (event.isLeft) {
          let prevMySplitter = null;
          if (prevSeg) {
            const prevInter = prevSeg.getIntersection(segment);
            if (prevInter !== null) {
              if (!segment.isAnEndpoint(prevInter)) prevMySplitter = prevInter;
              if (!prevSeg.isAnEndpoint(prevInter)) {
                const newEventsFromSplit = this._splitSafely(prevSeg, prevInter);
                for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
                  newEvents.push(newEventsFromSplit[i]);
                }
              }
            }
          }
          let nextMySplitter = null;
          if (nextSeg) {
            const nextInter = nextSeg.getIntersection(segment);
            if (nextInter !== null) {
              if (!segment.isAnEndpoint(nextInter)) nextMySplitter = nextInter;
              if (!nextSeg.isAnEndpoint(nextInter)) {
                const newEventsFromSplit = this._splitSafely(nextSeg, nextInter);
                for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
                  newEvents.push(newEventsFromSplit[i]);
                }
              }
            }
          }
          if (prevMySplitter !== null || nextMySplitter !== null) {
            let mySplitter = null;
            if (prevMySplitter === null) mySplitter = nextMySplitter;
            else if (nextMySplitter === null) mySplitter = prevMySplitter;
            else {
              const cmpSplitters = SweepEvent.comparePoints(prevMySplitter, nextMySplitter);
              mySplitter = cmpSplitters <= 0 ? prevMySplitter : nextMySplitter;
            }
            this.queue.remove(segment.rightSE);
            newEvents.push(segment.rightSE);
            const newEventsFromSplit = segment.split(mySplitter);
            for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
              newEvents.push(newEventsFromSplit[i]);
            }
          }
          if (newEvents.length > 0) {
            this.tree.remove(segment);
            newEvents.push(event);
          } else {
            this.segments.push(segment);
            segment.prev = prevSeg;
          }
        } else {
          if (prevSeg && nextSeg) {
            const inter = prevSeg.getIntersection(nextSeg);
            if (inter !== null) {
              if (!prevSeg.isAnEndpoint(inter)) {
                const newEventsFromSplit = this._splitSafely(prevSeg, inter);
                for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
                  newEvents.push(newEventsFromSplit[i]);
                }
              }
              if (!nextSeg.isAnEndpoint(inter)) {
                const newEventsFromSplit = this._splitSafely(nextSeg, inter);
                for (let i = 0, iMax = newEventsFromSplit.length; i < iMax; i++) {
                  newEvents.push(newEventsFromSplit[i]);
                }
              }
            }
          }
          this.tree.remove(segment);
        }
        return newEvents;
      }
      /* Safely split a segment that is currently in the datastructures
       * IE - a segment other than the one that is currently being processed. */
      _splitSafely(seg, pt) {
        this.tree.remove(seg);
        const rightSE = seg.rightSE;
        this.queue.remove(rightSE);
        const newEvents = seg.split(pt);
        newEvents.push(rightSE);
        if (seg.consumedBy === void 0) this.tree.add(seg);
        return newEvents;
      }
    };
    var POLYGON_CLIPPING_MAX_QUEUE_SIZE = typeof process !== "undefined" && process.env.POLYGON_CLIPPING_MAX_QUEUE_SIZE || 1e6;
    var POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS = typeof process !== "undefined" && process.env.POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS || 1e6;
    var Operation = class {
      run(type, geom, moreGeoms) {
        operation.type = type;
        rounder.reset();
        const multipolys = [new MultiPolyIn(geom, true)];
        for (let i = 0, iMax = moreGeoms.length; i < iMax; i++) {
          multipolys.push(new MultiPolyIn(moreGeoms[i], false));
        }
        operation.numMultiPolys = multipolys.length;
        if (operation.type === "difference") {
          const subject = multipolys[0];
          let i = 1;
          while (i < multipolys.length) {
            if (getBboxOverlap(multipolys[i].bbox, subject.bbox) !== null) i++;
            else multipolys.splice(i, 1);
          }
        }
        if (operation.type === "intersection") {
          for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
            const mpA = multipolys[i];
            for (let j = i + 1, jMax = multipolys.length; j < jMax; j++) {
              if (getBboxOverlap(mpA.bbox, multipolys[j].bbox) === null) return [];
            }
          }
        }
        const queue = new SplayTree__default["default"](SweepEvent.compare);
        for (let i = 0, iMax = multipolys.length; i < iMax; i++) {
          const sweepEvents = multipolys[i].getSweepEvents();
          for (let j = 0, jMax = sweepEvents.length; j < jMax; j++) {
            queue.insert(sweepEvents[j]);
            if (queue.size > POLYGON_CLIPPING_MAX_QUEUE_SIZE) {
              throw new Error("Infinite loop when putting segment endpoints in a priority queue (queue size too big).");
            }
          }
        }
        const sweepLine = new SweepLine(queue);
        let prevQueueSize = queue.size;
        let node = queue.pop();
        while (node) {
          const evt = node.key;
          if (queue.size === prevQueueSize) {
            const seg = evt.segment;
            throw new Error(`Unable to pop() ${evt.isLeft ? "left" : "right"} SweepEvent [${evt.point.x}, ${evt.point.y}] from segment #${seg.id} [${seg.leftSE.point.x}, ${seg.leftSE.point.y}] -> [${seg.rightSE.point.x}, ${seg.rightSE.point.y}] from queue.`);
          }
          if (queue.size > POLYGON_CLIPPING_MAX_QUEUE_SIZE) {
            throw new Error("Infinite loop when passing sweep line over endpoints (queue size too big).");
          }
          if (sweepLine.segments.length > POLYGON_CLIPPING_MAX_SWEEPLINE_SEGMENTS) {
            throw new Error("Infinite loop when passing sweep line over endpoints (too many sweep line segments).");
          }
          const newEvents = sweepLine.process(evt);
          for (let i = 0, iMax = newEvents.length; i < iMax; i++) {
            const evt2 = newEvents[i];
            if (evt2.consumedBy === void 0) queue.insert(evt2);
          }
          prevQueueSize = queue.size;
          node = queue.pop();
        }
        rounder.reset();
        const ringsOut = RingOut.factory(sweepLine.segments);
        const result = new MultiPolyOut(ringsOut);
        return result.getGeom();
      }
    };
    var operation = new Operation();
    var union = function(geom) {
      for (var _len = arguments.length, moreGeoms = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
        moreGeoms[_key - 1] = arguments[_key];
      }
      return operation.run("union", geom, moreGeoms);
    };
    var intersection = function(geom) {
      for (var _len2 = arguments.length, moreGeoms = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
        moreGeoms[_key2 - 1] = arguments[_key2];
      }
      return operation.run("intersection", geom, moreGeoms);
    };
    var xor = function(geom) {
      for (var _len3 = arguments.length, moreGeoms = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++) {
        moreGeoms[_key3 - 1] = arguments[_key3];
      }
      return operation.run("xor", geom, moreGeoms);
    };
    var difference = function(subjectGeom) {
      for (var _len4 = arguments.length, clippingGeoms = new Array(_len4 > 1 ? _len4 - 1 : 0), _key4 = 1; _key4 < _len4; _key4++) {
        clippingGeoms[_key4 - 1] = arguments[_key4];
      }
      return operation.run("difference", subjectGeom, clippingGeoms);
    };
    var index = {
      union,
      intersection,
      xor,
      difference
    };
    module2.exports = index;
  }
});

// scripts/gen-world.ts
var import_node_fs = require("node:fs");
var import_topojson_client = __toESM(require_topojson_client());

// node_modules/robust-predicates/esm/util.js
var epsilon = 11102230246251565e-32;
var splitter = 134217729;
var resulterrbound = (3 + 8 * epsilon) * epsilon;
function sum(elen, e, flen, f, h) {
  let Q, Qnew, hh, bvirt;
  let enow = e[0];
  let fnow = f[0];
  let eindex = 0;
  let findex = 0;
  if (fnow > enow === fnow > -enow) {
    Q = enow;
    enow = e[++eindex];
  } else {
    Q = fnow;
    fnow = f[++findex];
  }
  let hindex = 0;
  if (eindex < elen && findex < flen) {
    if (fnow > enow === fnow > -enow) {
      Qnew = enow + Q;
      hh = Q - (Qnew - enow);
      enow = e[++eindex];
    } else {
      Qnew = fnow + Q;
      hh = Q - (Qnew - fnow);
      fnow = f[++findex];
    }
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
    while (eindex < elen && findex < flen) {
      if (fnow > enow === fnow > -enow) {
        Qnew = Q + enow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (enow - bvirt);
        enow = e[++eindex];
      } else {
        Qnew = Q + fnow;
        bvirt = Qnew - Q;
        hh = Q - (Qnew - bvirt) + (fnow - bvirt);
        fnow = f[++findex];
      }
      Q = Qnew;
      if (hh !== 0) {
        h[hindex++] = hh;
      }
    }
  }
  while (eindex < elen) {
    Qnew = Q + enow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (enow - bvirt);
    enow = e[++eindex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  while (findex < flen) {
    Qnew = Q + fnow;
    bvirt = Qnew - Q;
    hh = Q - (Qnew - bvirt) + (fnow - bvirt);
    fnow = f[++findex];
    Q = Qnew;
    if (hh !== 0) {
      h[hindex++] = hh;
    }
  }
  if (Q !== 0 || hindex === 0) {
    h[hindex++] = Q;
  }
  return hindex;
}
function estimate(elen, e) {
  let Q = e[0];
  for (let i = 1; i < elen; i++) Q += e[i];
  return Q;
}
function vec(n) {
  return new Float64Array(n);
}

// node_modules/robust-predicates/esm/orient2d.js
var ccwerrboundA = (3 + 16 * epsilon) * epsilon;
var ccwerrboundB = (2 + 12 * epsilon) * epsilon;
var ccwerrboundC = (9 + 64 * epsilon) * epsilon * epsilon;
var B = vec(4);
var C1 = vec(8);
var C2 = vec(12);
var D = vec(16);
var u = vec(4);
function orient2dadapt(ax, ay, bx, by, cx, cy, detsum) {
  let acxtail, acytail, bcxtail, bcytail;
  let bvirt, c, ahi, alo, bhi, blo, _i, _j, _0, s1, s0, t1, t0, u32;
  const acx = ax - cx;
  const bcx = bx - cx;
  const acy = ay - cy;
  const bcy = by - cy;
  s1 = acx * bcy;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcx;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  B[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  B[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  B[2] = _j - (u32 - bvirt) + (_i - bvirt);
  B[3] = u32;
  let det = estimate(4, B);
  let errbound = ccwerrboundB * detsum;
  if (det >= errbound || -det >= errbound) {
    return det;
  }
  bvirt = ax - acx;
  acxtail = ax - (acx + bvirt) + (bvirt - cx);
  bvirt = bx - bcx;
  bcxtail = bx - (bcx + bvirt) + (bvirt - cx);
  bvirt = ay - acy;
  acytail = ay - (acy + bvirt) + (bvirt - cy);
  bvirt = by - bcy;
  bcytail = by - (bcy + bvirt) + (bvirt - cy);
  if (acxtail === 0 && acytail === 0 && bcxtail === 0 && bcytail === 0) {
    return det;
  }
  errbound = ccwerrboundC * detsum + resulterrbound * Math.abs(det);
  det += acx * bcytail + bcy * acxtail - (acy * bcxtail + bcx * acytail);
  if (det >= errbound || -det >= errbound) return det;
  s1 = acxtail * bcy;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcy;
  bhi = c - (c - bcy);
  blo = bcy - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcx;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcx;
  bhi = c - (c - bcx);
  blo = bcx - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C1len = sum(4, B, 4, u, C1);
  s1 = acx * bcytail;
  c = splitter * acx;
  ahi = c - (c - acx);
  alo = acx - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acy * bcxtail;
  c = splitter * acy;
  ahi = c - (c - acy);
  alo = acy - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const C2len = sum(C1len, C1, 4, u, C2);
  s1 = acxtail * bcytail;
  c = splitter * acxtail;
  ahi = c - (c - acxtail);
  alo = acxtail - ahi;
  c = splitter * bcytail;
  bhi = c - (c - bcytail);
  blo = bcytail - bhi;
  s0 = alo * blo - (s1 - ahi * bhi - alo * bhi - ahi * blo);
  t1 = acytail * bcxtail;
  c = splitter * acytail;
  ahi = c - (c - acytail);
  alo = acytail - ahi;
  c = splitter * bcxtail;
  bhi = c - (c - bcxtail);
  blo = bcxtail - bhi;
  t0 = alo * blo - (t1 - ahi * bhi - alo * bhi - ahi * blo);
  _i = s0 - t0;
  bvirt = s0 - _i;
  u[0] = s0 - (_i + bvirt) + (bvirt - t0);
  _j = s1 + _i;
  bvirt = _j - s1;
  _0 = s1 - (_j - bvirt) + (_i - bvirt);
  _i = _0 - t1;
  bvirt = _0 - _i;
  u[1] = _0 - (_i + bvirt) + (bvirt - t1);
  u32 = _j + _i;
  bvirt = u32 - _j;
  u[2] = _j - (u32 - bvirt) + (_i - bvirt);
  u[3] = u32;
  const Dlen = sum(C2len, C2, 4, u, D);
  return D[Dlen - 1];
}
function orient2d(ax, ay, bx, by, cx, cy) {
  const detleft = (ay - cy) * (bx - cx);
  const detright = (ax - cx) * (by - cy);
  const det = detleft - detright;
  const detsum = Math.abs(detleft + detright);
  if (Math.abs(det) >= ccwerrboundA * detsum) return det;
  return -orient2dadapt(ax, ay, bx, by, cx, cy, detsum);
}

// node_modules/robust-predicates/esm/orient3d.js
var o3derrboundA = (7 + 56 * epsilon) * epsilon;
var o3derrboundB = (3 + 28 * epsilon) * epsilon;
var o3derrboundC = (26 + 288 * epsilon) * epsilon * epsilon;
var bc = vec(4);
var ca = vec(4);
var ab = vec(4);
var at_b = vec(4);
var at_c = vec(4);
var bt_c = vec(4);
var bt_a = vec(4);
var ct_a = vec(4);
var ct_b = vec(4);
var bct = vec(8);
var cat = vec(8);
var abt = vec(8);
var u2 = vec(4);
var _8 = vec(8);
var _8b = vec(8);
var _16 = vec(16);
var _12 = vec(12);
var fin = vec(192);
var fin2 = vec(192);

// node_modules/robust-predicates/esm/incircle.js
var iccerrboundA = (10 + 96 * epsilon) * epsilon;
var iccerrboundB = (4 + 48 * epsilon) * epsilon;
var iccerrboundC = (44 + 576 * epsilon) * epsilon * epsilon;
var bc2 = vec(4);
var ca2 = vec(4);
var ab2 = vec(4);
var aa = vec(4);
var bb = vec(4);
var cc = vec(4);
var u3 = vec(4);
var v = vec(4);
var axtbc = vec(8);
var aytbc = vec(8);
var bxtca = vec(8);
var bytca = vec(8);
var cxtab = vec(8);
var cytab = vec(8);
var abt2 = vec(8);
var bct2 = vec(8);
var cat2 = vec(8);
var abtt = vec(4);
var bctt = vec(4);
var catt = vec(4);
var _82 = vec(8);
var _162 = vec(16);
var _16b = vec(16);
var _16c = vec(16);
var _32 = vec(32);
var _32b = vec(32);
var _48 = vec(48);
var _64 = vec(64);
var fin3 = vec(1152);
var fin22 = vec(1152);

// node_modules/robust-predicates/esm/insphere.js
var isperrboundA = (16 + 224 * epsilon) * epsilon;
var isperrboundB = (5 + 72 * epsilon) * epsilon;
var isperrboundC = (71 + 1408 * epsilon) * epsilon * epsilon;
var ab3 = vec(4);
var bc3 = vec(4);
var cd = vec(4);
var de = vec(4);
var ea = vec(4);
var ac = vec(4);
var bd = vec(4);
var ce = vec(4);
var da = vec(4);
var eb = vec(4);
var abc = vec(24);
var bcd = vec(24);
var cde = vec(24);
var dea = vec(24);
var eab = vec(24);
var abd = vec(24);
var bce = vec(24);
var cda = vec(24);
var deb = vec(24);
var eac = vec(24);
var adet = vec(1152);
var bdet = vec(1152);
var cdet = vec(1152);
var ddet = vec(1152);
var edet = vec(1152);
var abdet = vec(2304);
var cddet = vec(2304);
var cdedet = vec(3456);
var deter = vec(5760);
var _83 = vec(8);
var _8b2 = vec(8);
var _8c = vec(8);
var _163 = vec(16);
var _24 = vec(24);
var _482 = vec(48);
var _48b = vec(48);
var _96 = vec(96);
var _192 = vec(192);
var _384x = vec(384);
var _384y = vec(384);
var _384z = vec(384);
var _768 = vec(768);
var xdet = vec(96);
var ydet = vec(96);
var zdet = vec(96);
var fin4 = vec(1152);

// node_modules/delaunator/index.js
var EPSILON = Math.pow(2, -52);
var EDGE_STACK = new Uint32Array(512);
var Delaunator = class _Delaunator {
  /**
   * Constructs a delaunay triangulation object given an array of points (`[x, y]` by default).
   * `getX` and `getY` are optional functions of the form `(point) => value` for custom point formats.
   *
   * @template P
   * @param {P[]} points
   * @param {(p: P) => number} [getX]
   * @param {(p: P) => number} [getY]
   */
  // @ts-expect-error TS2322
  static from(points, getX = defaultGetX, getY = defaultGetY) {
    const n = points.length;
    const coords = new Float64Array(n * 2);
    for (let i = 0; i < n; i++) {
      const p = points[i];
      coords[2 * i] = getX(p);
      coords[2 * i + 1] = getY(p);
    }
    return new _Delaunator(coords);
  }
  /**
   * Constructs a delaunay triangulation object given an array of point coordinates of the form:
   * `[x0, y0, x1, y1, ...]` (use a typed array for best performance). Duplicate points are skipped.
   *
   * @param {T} coords
   */
  constructor(coords) {
    const n = coords.length >> 1;
    if (n > 0 && typeof coords[0] !== "number") throw new Error("Expected coords to contain numbers.");
    this.coords = coords;
    const maxTriangles = Math.max(2 * n - 5, 0);
    this._triangles = new Uint32Array(maxTriangles * 3);
    this._halfedges = new Int32Array(maxTriangles * 3);
    this._hashSize = Math.ceil(Math.sqrt(n));
    this._hullPrev = new Uint32Array(n);
    this._hullNext = new Uint32Array(n);
    this._hullTri = new Uint32Array(n);
    this._hullHash = new Int32Array(this._hashSize);
    this._ids = new Uint32Array(n);
    this._dists = new Float64Array(n);
    this.trianglesLen = 0;
    this._cx = 0;
    this._cy = 0;
    this._hullStart = 0;
    this.hull = this._triangles;
    this.triangles = this._triangles;
    this.halfedges = this._halfedges;
    this.update();
  }
  /**
   * Updates the triangulation if you modified `delaunay.coords` values in place, avoiding expensive memory allocations.
   * Useful for iterative relaxation algorithms such as Lloyd's.
   */
  update() {
    const { coords, _hullPrev: hullPrev, _hullNext: hullNext, _hullTri: hullTri, _hullHash: hullHash } = this;
    const n = coords.length >> 1;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
      this._ids[i] = i;
    }
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    let i0 = 0, i1 = 0, i2 = 0;
    for (let i = 0, minDist = Infinity; i < n; i++) {
      const d = dist(cx, cy, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist) {
        i0 = i;
        minDist = d;
      }
    }
    const i0x = coords[2 * i0];
    const i0y = coords[2 * i0 + 1];
    for (let i = 0, minDist = Infinity; i < n; i++) {
      if (i === i0) continue;
      const d = dist(i0x, i0y, coords[2 * i], coords[2 * i + 1]);
      if (d < minDist && d > 0) {
        i1 = i;
        minDist = d;
      }
    }
    let i1x = coords[2 * i1];
    let i1y = coords[2 * i1 + 1];
    let minRadius = Infinity;
    for (let i = 0; i < n; i++) {
      if (i === i0 || i === i1) continue;
      const r = circumradius(i0x, i0y, i1x, i1y, coords[2 * i], coords[2 * i + 1]);
      if (r < minRadius) {
        i2 = i;
        minRadius = r;
      }
    }
    let i2x = coords[2 * i2];
    let i2y = coords[2 * i2 + 1];
    if (minRadius === Infinity) {
      for (let i = 0; i < n; i++) {
        this._dists[i] = coords[2 * i] - coords[0] || coords[2 * i + 1] - coords[1];
      }
      quicksort(this._ids, this._dists, 0, n - 1);
      const hull = new Uint32Array(n);
      let j = 0;
      for (let i = 0, d0 = -Infinity; i < n; i++) {
        const id = this._ids[i];
        const d = this._dists[id];
        if (d > d0) {
          hull[j++] = id;
          d0 = d;
        }
      }
      this.hull = hull.subarray(0, j);
      this.triangles = new Uint32Array(0);
      this.halfedges = new Int32Array(0);
      return;
    }
    if (orient2d(i0x, i0y, i1x, i1y, i2x, i2y) < 0) {
      const i = i1;
      const x = i1x;
      const y = i1y;
      i1 = i2;
      i1x = i2x;
      i1y = i2y;
      i2 = i;
      i2x = x;
      i2y = y;
    }
    const center2 = circumcenter(i0x, i0y, i1x, i1y, i2x, i2y);
    this._cx = center2.x;
    this._cy = center2.y;
    for (let i = 0; i < n; i++) {
      this._dists[i] = dist(coords[2 * i], coords[2 * i + 1], center2.x, center2.y);
    }
    quicksort(this._ids, this._dists, 0, n - 1);
    this._hullStart = i0;
    let hullSize = 3;
    hullNext[i0] = hullPrev[i2] = i1;
    hullNext[i1] = hullPrev[i0] = i2;
    hullNext[i2] = hullPrev[i1] = i0;
    hullTri[i0] = 0;
    hullTri[i1] = 1;
    hullTri[i2] = 2;
    hullHash.fill(-1);
    hullHash[this._hashKey(i0x, i0y)] = i0;
    hullHash[this._hashKey(i1x, i1y)] = i1;
    hullHash[this._hashKey(i2x, i2y)] = i2;
    this.trianglesLen = 0;
    this._addTriangle(i0, i1, i2, -1, -1, -1);
    for (let k = 0, xp = 0, yp = 0; k < this._ids.length; k++) {
      const i = this._ids[k];
      const x = coords[2 * i];
      const y = coords[2 * i + 1];
      if (k > 0 && Math.abs(x - xp) <= EPSILON && Math.abs(y - yp) <= EPSILON) continue;
      xp = x;
      yp = y;
      if (i === i0 || i === i1 || i === i2) continue;
      let start = 0;
      for (let j = 0, key = this._hashKey(x, y); j < this._hashSize; j++) {
        start = hullHash[(key + j) % this._hashSize];
        if (start !== -1 && start !== hullNext[start]) break;
      }
      start = hullPrev[start];
      let e = start, q;
      while (q = hullNext[e], orient2d(x, y, coords[2 * e], coords[2 * e + 1], coords[2 * q], coords[2 * q + 1]) >= 0) {
        e = q;
        if (e === start) {
          e = -1;
          break;
        }
      }
      if (e === -1) continue;
      let t = this._addTriangle(e, i, hullNext[e], -1, -1, hullTri[e]);
      hullTri[i] = this._legalize(t + 2);
      hullTri[e] = t;
      hullSize++;
      let n2 = hullNext[e];
      while (q = hullNext[n2], orient2d(x, y, coords[2 * n2], coords[2 * n2 + 1], coords[2 * q], coords[2 * q + 1]) < 0) {
        t = this._addTriangle(n2, i, q, hullTri[i], -1, hullTri[n2]);
        hullTri[i] = this._legalize(t + 2);
        hullNext[n2] = n2;
        hullSize--;
        n2 = q;
      }
      if (e === start) {
        while (q = hullPrev[e], orient2d(x, y, coords[2 * q], coords[2 * q + 1], coords[2 * e], coords[2 * e + 1]) < 0) {
          t = this._addTriangle(q, i, e, -1, hullTri[e], hullTri[q]);
          this._legalize(t + 2);
          hullTri[q] = t;
          hullNext[e] = e;
          hullSize--;
          e = q;
        }
      }
      this._hullStart = hullPrev[i] = e;
      hullNext[e] = hullPrev[n2] = i;
      hullNext[i] = n2;
      hullHash[this._hashKey(x, y)] = i;
      hullHash[this._hashKey(coords[2 * e], coords[2 * e + 1])] = e;
    }
    this.hull = new Uint32Array(hullSize);
    for (let i = 0, e = this._hullStart; i < hullSize; i++) {
      this.hull[i] = e;
      e = hullNext[e];
    }
    this.triangles = this._triangles.subarray(0, this.trianglesLen);
    this.halfedges = this._halfedges.subarray(0, this.trianglesLen);
  }
  /**
   * Calculate an angle-based key for the edge hash used for advancing convex hull.
   *
   * @param {number} x
   * @param {number} y
   * @private
   */
  _hashKey(x, y) {
    return Math.floor(pseudoAngle(x - this._cx, y - this._cy) * this._hashSize) % this._hashSize;
  }
  /**
   * Flip an edge in a pair of triangles if it doesn't satisfy the Delaunay condition.
   *
   * @param {number} a
   * @private
   */
  _legalize(a) {
    const { _triangles: triangles, _halfedges: halfedges, coords } = this;
    let i = 0;
    let ar = 0;
    while (true) {
      const b = halfedges[a];
      const a0 = a - a % 3;
      ar = a0 + (a + 2) % 3;
      if (b === -1) {
        if (i === 0) break;
        a = EDGE_STACK[--i];
        continue;
      }
      const b0 = b - b % 3;
      const al = a0 + (a + 1) % 3;
      const bl = b0 + (b + 2) % 3;
      const p0 = triangles[ar];
      const pr = triangles[a];
      const pl = triangles[al];
      const p1 = triangles[bl];
      const illegal = inCircle(
        coords[2 * p0],
        coords[2 * p0 + 1],
        coords[2 * pr],
        coords[2 * pr + 1],
        coords[2 * pl],
        coords[2 * pl + 1],
        coords[2 * p1],
        coords[2 * p1 + 1]
      );
      if (illegal) {
        triangles[a] = p1;
        triangles[b] = p0;
        const hbl = halfedges[bl];
        if (hbl === -1) {
          let e = this._hullStart;
          do {
            if (this._hullTri[e] === bl) {
              this._hullTri[e] = a;
              break;
            }
            e = this._hullPrev[e];
          } while (e !== this._hullStart);
        }
        this._link(a, hbl);
        this._link(b, halfedges[ar]);
        this._link(ar, bl);
        const br = b0 + (b + 1) % 3;
        if (i < EDGE_STACK.length) {
          EDGE_STACK[i++] = br;
        }
      } else {
        if (i === 0) break;
        a = EDGE_STACK[--i];
      }
    }
    return ar;
  }
  /**
   * Link two half-edges to each other.
   * @param {number} a
   * @param {number} b
   * @private
   */
  _link(a, b) {
    this._halfedges[a] = b;
    if (b !== -1) this._halfedges[b] = a;
  }
  /**
   * Add a new triangle given vertex indices and adjacent half-edge ids.
   *
   * @param {number} i0
   * @param {number} i1
   * @param {number} i2
   * @param {number} a
   * @param {number} b
   * @param {number} c
   * @private
   */
  _addTriangle(i0, i1, i2, a, b, c) {
    const t = this.trianglesLen;
    this._triangles[t] = i0;
    this._triangles[t + 1] = i1;
    this._triangles[t + 2] = i2;
    this._link(t, a);
    this._link(t + 1, b);
    this._link(t + 2, c);
    this.trianglesLen += 3;
    return t;
  }
};
function pseudoAngle(dx, dy) {
  const p = dx / (Math.abs(dx) + Math.abs(dy));
  return (dy > 0 ? 3 - p : 1 + p) / 4;
}
function dist(ax, ay, bx, by) {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}
function inCircle(ax, ay, bx, by, cx, cy, px, py) {
  const dx = ax - px;
  const dy = ay - py;
  const ex = bx - px;
  const ey = by - py;
  const fx = cx - px;
  const fy = cy - py;
  const ap = dx * dx + dy * dy;
  const bp = ex * ex + ey * ey;
  const cp = fx * fx + fy * fy;
  return dx * (ey * cp - bp * fy) - dy * (ex * cp - bp * fx) + ap * (ex * fy - ey * fx) < 0;
}
function circumradius(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = (ey * bl - dy * cl) * d;
  const y = (dx * cl - ex * bl) * d;
  return x * x + y * y;
}
function circumcenter(ax, ay, bx, by, cx, cy) {
  const dx = bx - ax;
  const dy = by - ay;
  const ex = cx - ax;
  const ey = cy - ay;
  const bl = dx * dx + dy * dy;
  const cl = ex * ex + ey * ey;
  const d = 0.5 / (dx * ey - dy * ex);
  const x = ax + (ey * bl - dy * cl) * d;
  const y = ay + (dx * cl - ex * bl) * d;
  return { x, y };
}
function quicksort(ids2, dists, left, right) {
  if (right - left <= 20) {
    for (let i = left + 1; i <= right; i++) {
      const temp = ids2[i];
      const tempDist = dists[temp];
      let j = i - 1;
      while (j >= left && dists[ids2[j]] > tempDist) ids2[j + 1] = ids2[j--];
      ids2[j + 1] = temp;
    }
  } else {
    const median = left + right >> 1;
    let i = left + 1;
    let j = right;
    swap(ids2, median, i);
    if (dists[ids2[left]] > dists[ids2[right]]) swap(ids2, left, right);
    if (dists[ids2[i]] > dists[ids2[right]]) swap(ids2, i, right);
    if (dists[ids2[left]] > dists[ids2[i]]) swap(ids2, left, i);
    const temp = ids2[i];
    const tempDist = dists[temp];
    while (true) {
      do
        i++;
      while (dists[ids2[i]] < tempDist);
      do
        j--;
      while (dists[ids2[j]] > tempDist);
      if (j < i) break;
      swap(ids2, i, j);
    }
    ids2[left + 1] = ids2[j];
    ids2[j] = temp;
    if (right - i + 1 >= j - left) {
      quicksort(ids2, dists, i, right);
      quicksort(ids2, dists, left, j - 1);
    } else {
      quicksort(ids2, dists, left, j - 1);
      quicksort(ids2, dists, i, right);
    }
  }
}
function swap(arr, i, j) {
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
}
function defaultGetX(p) {
  return p[0];
}
function defaultGetY(p) {
  return p[1];
}

// node_modules/d3-delaunay/src/path.js
var epsilon2 = 1e-6;
var Path = class {
  constructor() {
    this._x0 = this._y0 = // start of current subpath
    this._x1 = this._y1 = null;
    this._ = "";
  }
  moveTo(x, y) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}`;
  }
  closePath() {
    if (this._x1 !== null) {
      this._x1 = this._x0, this._y1 = this._y0;
      this._ += "Z";
    }
  }
  lineTo(x, y) {
    this._ += `L${this._x1 = +x},${this._y1 = +y}`;
  }
  arc(x, y, r) {
    x = +x, y = +y, r = +r;
    const x0 = x + r;
    const y0 = y;
    if (r < 0) throw new Error("negative radius");
    if (this._x1 === null) this._ += `M${x0},${y0}`;
    else if (Math.abs(this._x1 - x0) > epsilon2 || Math.abs(this._y1 - y0) > epsilon2) this._ += "L" + x0 + "," + y0;
    if (!r) return;
    this._ += `A${r},${r},0,1,1,${x - r},${y}A${r},${r},0,1,1,${this._x1 = x0},${this._y1 = y0}`;
  }
  rect(x, y, w, h) {
    this._ += `M${this._x0 = this._x1 = +x},${this._y0 = this._y1 = +y}h${+w}v${+h}h${-w}Z`;
  }
  value() {
    return this._ || null;
  }
};

// node_modules/d3-delaunay/src/polygon.js
var Polygon = class {
  constructor() {
    this._ = [];
  }
  moveTo(x, y) {
    this._.push([x, y]);
  }
  closePath() {
    this._.push(this._[0].slice());
  }
  lineTo(x, y) {
    this._.push([x, y]);
  }
  value() {
    return this._.length ? this._ : null;
  }
};

// node_modules/d3-delaunay/src/voronoi.js
var Voronoi = class {
  constructor(delaunay, [xmin, ymin, xmax, ymax] = [0, 0, 960, 500]) {
    if (!((xmax = +xmax) >= (xmin = +xmin)) || !((ymax = +ymax) >= (ymin = +ymin))) throw new Error("invalid bounds");
    this.delaunay = delaunay;
    this._circumcenters = new Float64Array(delaunay.points.length * 2);
    this.vectors = new Float64Array(delaunay.points.length * 2);
    this.xmax = xmax, this.xmin = xmin;
    this.ymax = ymax, this.ymin = ymin;
    this._init();
  }
  update() {
    this.delaunay.update();
    this._init();
    return this;
  }
  _init() {
    const { delaunay: { points, hull, triangles }, vectors } = this;
    let bx, by;
    const circumcenters = this.circumcenters = this._circumcenters.subarray(0, triangles.length / 3 * 2);
    for (let i = 0, j = 0, n = triangles.length, x, y; i < n; i += 3, j += 2) {
      const t1 = triangles[i] * 2;
      const t2 = triangles[i + 1] * 2;
      const t3 = triangles[i + 2] * 2;
      const x12 = points[t1];
      const y12 = points[t1 + 1];
      const x2 = points[t2];
      const y2 = points[t2 + 1];
      const x3 = points[t3];
      const y3 = points[t3 + 1];
      const dx = x2 - x12;
      const dy = y2 - y12;
      const ex = x3 - x12;
      const ey = y3 - y12;
      const ab4 = (dx * ey - dy * ex) * 2;
      if (Math.abs(ab4) < 1e-9) {
        if (bx === void 0) {
          bx = by = 0;
          for (const i2 of hull) bx += points[i2 * 2], by += points[i2 * 2 + 1];
          bx /= hull.length, by /= hull.length;
        }
        const a = 1e9 * Math.sign((bx - x12) * ey - (by - y12) * ex);
        x = (x12 + x3) / 2 - a * ey;
        y = (y12 + y3) / 2 + a * ex;
      } else {
        const d = 1 / ab4;
        const bl = dx * dx + dy * dy;
        const cl = ex * ex + ey * ey;
        x = x12 + (ey * bl - dy * cl) * d;
        y = y12 + (dx * cl - ex * bl) * d;
      }
      circumcenters[j] = x;
      circumcenters[j + 1] = y;
    }
    let h = hull[hull.length - 1];
    let p0, p1 = h * 4;
    let x0, x1 = points[2 * h];
    let y0, y1 = points[2 * h + 1];
    vectors.fill(0);
    for (let i = 0; i < hull.length; ++i) {
      h = hull[i];
      p0 = p1, x0 = x1, y0 = y1;
      p1 = h * 4, x1 = points[2 * h], y1 = points[2 * h + 1];
      vectors[p0 + 2] = vectors[p1] = y0 - y1;
      vectors[p0 + 3] = vectors[p1 + 1] = x1 - x0;
    }
  }
  render(context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { delaunay: { halfedges, inedges, hull }, circumcenters, vectors } = this;
    if (hull.length <= 1) return null;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < i) continue;
      const ti = Math.floor(i / 3) * 2;
      const tj = Math.floor(j / 3) * 2;
      const xi = circumcenters[ti];
      const yi = circumcenters[ti + 1];
      const xj = circumcenters[tj];
      const yj = circumcenters[tj + 1];
      this._renderSegment(xi, yi, xj, yj, context);
    }
    let h0, h1 = hull[hull.length - 1];
    for (let i = 0; i < hull.length; ++i) {
      h0 = h1, h1 = hull[i];
      const t = Math.floor(inedges[h1] / 3) * 2;
      const x = circumcenters[t];
      const y = circumcenters[t + 1];
      const v2 = h0 * 4;
      const p = this._project(x, y, vectors[v2 + 2], vectors[v2 + 3]);
      if (p) this._renderSegment(x, y, p[0], p[1], context);
    }
    return buffer && buffer.value();
  }
  renderBounds(context) {
    const buffer = context == null ? context = new Path() : void 0;
    context.rect(this.xmin, this.ymin, this.xmax - this.xmin, this.ymax - this.ymin);
    return buffer && buffer.value();
  }
  renderCell(i, context) {
    const buffer = context == null ? context = new Path() : void 0;
    const points = this._clip(i);
    if (points === null || !points.length) return;
    context.moveTo(points[0], points[1]);
    let n = points.length;
    while (points[0] === points[n - 2] && points[1] === points[n - 1] && n > 1) n -= 2;
    for (let i2 = 2; i2 < n; i2 += 2) {
      if (points[i2] !== points[i2 - 2] || points[i2 + 1] !== points[i2 - 1])
        context.lineTo(points[i2], points[i2 + 1]);
    }
    context.closePath();
    return buffer && buffer.value();
  }
  *cellPolygons() {
    const { delaunay: { points } } = this;
    for (let i = 0, n = points.length / 2; i < n; ++i) {
      const cell = this.cellPolygon(i);
      if (cell) cell.index = i, yield cell;
    }
  }
  cellPolygon(i) {
    const polygon = new Polygon();
    this.renderCell(i, polygon);
    return polygon.value();
  }
  _renderSegment(x0, y0, x1, y1, context) {
    let S2;
    const c0 = this._regioncode(x0, y0);
    const c1 = this._regioncode(x1, y1);
    if (c0 === 0 && c1 === 0) {
      context.moveTo(x0, y0);
      context.lineTo(x1, y1);
    } else if (S2 = this._clipSegment(x0, y0, x1, y1, c0, c1)) {
      context.moveTo(S2[0], S2[1]);
      context.lineTo(S2[2], S2[3]);
    }
  }
  contains(i, x, y) {
    if ((x = +x, x !== x) || (y = +y, y !== y)) return false;
    return this.delaunay._step(i, x, y) === i;
  }
  *neighbors(i) {
    const ci = this._clip(i);
    if (ci) for (const j of this.delaunay.neighbors(i)) {
      const cj = this._clip(j);
      if (cj) loop: for (let ai = 0, li = ci.length; ai < li; ai += 2) {
        for (let aj = 0, lj = cj.length; aj < lj; aj += 2) {
          if (ci[ai] === cj[aj] && ci[ai + 1] === cj[aj + 1] && ci[(ai + 2) % li] === cj[(aj + lj - 2) % lj] && ci[(ai + 3) % li] === cj[(aj + lj - 1) % lj]) {
            yield j;
            break loop;
          }
        }
      }
    }
  }
  _cell(i) {
    const { circumcenters, delaunay: { inedges, halfedges, triangles } } = this;
    const e0 = inedges[i];
    if (e0 === -1) return null;
    const points = [];
    let e = e0;
    do {
      const t = Math.floor(e / 3);
      points.push(circumcenters[t * 2], circumcenters[t * 2 + 1]);
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i) break;
      e = halfedges[e];
    } while (e !== e0 && e !== -1);
    return points;
  }
  _clip(i) {
    if (i === 0 && this.delaunay.hull.length === 1) {
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    }
    const points = this._cell(i);
    if (points === null) return null;
    const { vectors: V } = this;
    const v2 = i * 4;
    return this._simplify(V[v2] || V[v2 + 1] ? this._clipInfinite(i, points, V[v2], V[v2 + 1], V[v2 + 2], V[v2 + 3]) : this._clipFinite(i, points));
  }
  _clipFinite(i, points) {
    const n = points.length;
    let P = null;
    let x0, y0, x1 = points[n - 2], y1 = points[n - 1];
    let c0, c1 = this._regioncode(x1, y1);
    let e0, e1 = 0;
    for (let j = 0; j < n; j += 2) {
      x0 = x1, y0 = y1, x1 = points[j], y1 = points[j + 1];
      c0 = c1, c1 = this._regioncode(x1, y1);
      if (c0 === 0 && c1 === 0) {
        e0 = e1, e1 = 0;
        if (P) P.push(x1, y1);
        else P = [x1, y1];
      } else {
        let S2, sx0, sy0, sx1, sy1;
        if (c0 === 0) {
          if ((S2 = this._clipSegment(x0, y0, x1, y1, c0, c1)) === null) continue;
          [sx0, sy0, sx1, sy1] = S2;
        } else {
          if ((S2 = this._clipSegment(x1, y1, x0, y0, c1, c0)) === null) continue;
          [sx1, sy1, sx0, sy0] = S2;
          e0 = e1, e1 = this._edgecode(sx0, sy0);
          if (e0 && e1) this._edge(i, e0, e1, P, P.length);
          if (P) P.push(sx0, sy0);
          else P = [sx0, sy0];
        }
        e0 = e1, e1 = this._edgecode(sx1, sy1);
        if (e0 && e1) this._edge(i, e0, e1, P, P.length);
        if (P) P.push(sx1, sy1);
        else P = [sx1, sy1];
      }
    }
    if (P) {
      e0 = e1, e1 = this._edgecode(P[0], P[1]);
      if (e0 && e1) this._edge(i, e0, e1, P, P.length);
    } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
      return [this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax, this.xmin, this.ymin];
    }
    return P;
  }
  _clipSegment(x0, y0, x1, y1, c0, c1) {
    const flip = c0 < c1;
    if (flip) [x0, y0, x1, y1, c0, c1] = [x1, y1, x0, y0, c1, c0];
    while (true) {
      if (c0 === 0 && c1 === 0) return flip ? [x1, y1, x0, y0] : [x0, y0, x1, y1];
      if (c0 & c1) return null;
      let x, y, c = c0 || c1;
      if (c & 8) x = x0 + (x1 - x0) * (this.ymax - y0) / (y1 - y0), y = this.ymax;
      else if (c & 4) x = x0 + (x1 - x0) * (this.ymin - y0) / (y1 - y0), y = this.ymin;
      else if (c & 2) y = y0 + (y1 - y0) * (this.xmax - x0) / (x1 - x0), x = this.xmax;
      else y = y0 + (y1 - y0) * (this.xmin - x0) / (x1 - x0), x = this.xmin;
      if (c0) x0 = x, y0 = y, c0 = this._regioncode(x0, y0);
      else x1 = x, y1 = y, c1 = this._regioncode(x1, y1);
    }
  }
  _clipInfinite(i, points, vx0, vy0, vxn, vyn) {
    let P = Array.from(points), p;
    if (p = this._project(P[0], P[1], vx0, vy0)) P.unshift(p[0], p[1]);
    if (p = this._project(P[P.length - 2], P[P.length - 1], vxn, vyn)) P.push(p[0], p[1]);
    if (P = this._clipFinite(i, P)) {
      for (let j = 0, n = P.length, c0, c1 = this._edgecode(P[n - 2], P[n - 1]); j < n; j += 2) {
        c0 = c1, c1 = this._edgecode(P[j], P[j + 1]);
        if (c0 && c1) j = this._edge(i, c0, c1, P, j), n = P.length;
      }
    } else if (this.contains(i, (this.xmin + this.xmax) / 2, (this.ymin + this.ymax) / 2)) {
      P = [this.xmin, this.ymin, this.xmax, this.ymin, this.xmax, this.ymax, this.xmin, this.ymax];
    }
    return P;
  }
  _edge(i, e0, e1, P, j) {
    while (e0 !== e1) {
      let x, y;
      switch (e0) {
        case 5:
          e0 = 4;
          continue;
        // top-left
        case 4:
          e0 = 6, x = this.xmax, y = this.ymin;
          break;
        // top
        case 6:
          e0 = 2;
          continue;
        // top-right
        case 2:
          e0 = 10, x = this.xmax, y = this.ymax;
          break;
        // right
        case 10:
          e0 = 8;
          continue;
        // bottom-right
        case 8:
          e0 = 9, x = this.xmin, y = this.ymax;
          break;
        // bottom
        case 9:
          e0 = 1;
          continue;
        // bottom-left
        case 1:
          e0 = 5, x = this.xmin, y = this.ymin;
          break;
      }
      if ((P[j] !== x || P[j + 1] !== y) && this.contains(i, x, y)) {
        P.splice(j, 0, x, y), j += 2;
      }
    }
    return j;
  }
  _project(x0, y0, vx, vy) {
    let t = Infinity, c, x, y;
    if (vy < 0) {
      if (y0 <= this.ymin) return null;
      if ((c = (this.ymin - y0) / vy) < t) y = this.ymin, x = x0 + (t = c) * vx;
    } else if (vy > 0) {
      if (y0 >= this.ymax) return null;
      if ((c = (this.ymax - y0) / vy) < t) y = this.ymax, x = x0 + (t = c) * vx;
    }
    if (vx > 0) {
      if (x0 >= this.xmax) return null;
      if ((c = (this.xmax - x0) / vx) < t) x = this.xmax, y = y0 + (t = c) * vy;
    } else if (vx < 0) {
      if (x0 <= this.xmin) return null;
      if ((c = (this.xmin - x0) / vx) < t) x = this.xmin, y = y0 + (t = c) * vy;
    }
    return [x, y];
  }
  _edgecode(x, y) {
    return (x === this.xmin ? 1 : x === this.xmax ? 2 : 0) | (y === this.ymin ? 4 : y === this.ymax ? 8 : 0);
  }
  _regioncode(x, y) {
    return (x < this.xmin ? 1 : x > this.xmax ? 2 : 0) | (y < this.ymin ? 4 : y > this.ymax ? 8 : 0);
  }
  _simplify(P) {
    if (P && P.length > 4) {
      for (let i = 0; i < P.length; i += 2) {
        const j = (i + 2) % P.length, k = (i + 4) % P.length;
        if (P[i] === P[j] && P[j] === P[k] || P[i + 1] === P[j + 1] && P[j + 1] === P[k + 1]) {
          P.splice(j, 2), i -= 2;
        }
      }
      if (!P.length) P = null;
    }
    return P;
  }
};

// node_modules/d3-delaunay/src/delaunay.js
var tau = 2 * Math.PI;
var pow = Math.pow;
function pointX(p) {
  return p[0];
}
function pointY(p) {
  return p[1];
}
function collinear(d) {
  const { triangles, coords } = d;
  for (let i = 0; i < triangles.length; i += 3) {
    const a = 2 * triangles[i], b = 2 * triangles[i + 1], c = 2 * triangles[i + 2], cross = (coords[c] - coords[a]) * (coords[b + 1] - coords[a + 1]) - (coords[b] - coords[a]) * (coords[c + 1] - coords[a + 1]);
    if (cross > 1e-10) return false;
  }
  return true;
}
function jitter(x, y, r) {
  return [x + Math.sin(x + y) * r, y + Math.cos(x - y) * r];
}
var Delaunay = class _Delaunay {
  static from(points, fx = pointX, fy = pointY, that) {
    return new _Delaunay("length" in points ? flatArray(points, fx, fy, that) : Float64Array.from(flatIterable(points, fx, fy, that)));
  }
  constructor(points) {
    this._delaunator = new Delaunator(points);
    this.inedges = new Int32Array(points.length / 2);
    this._hullIndex = new Int32Array(points.length / 2);
    this.points = this._delaunator.coords;
    this._init();
  }
  update() {
    this._delaunator.update();
    this._init();
    return this;
  }
  _init() {
    const d = this._delaunator, points = this.points;
    if (d.hull && d.hull.length > 2 && collinear(d)) {
      this.collinear = Int32Array.from({ length: points.length / 2 }, (_, i) => i).sort((i, j) => points[2 * i] - points[2 * j] || points[2 * i + 1] - points[2 * j + 1]);
      const e = this.collinear[0], f = this.collinear[this.collinear.length - 1], bounds = [points[2 * e], points[2 * e + 1], points[2 * f], points[2 * f + 1]], r = 1e-8 * Math.hypot(bounds[3] - bounds[1], bounds[2] - bounds[0]);
      for (let i = 0, n = points.length / 2; i < n; ++i) {
        const p = jitter(points[2 * i], points[2 * i + 1], r);
        points[2 * i] = p[0];
        points[2 * i + 1] = p[1];
      }
      this._delaunator = new Delaunator(points);
    } else {
      delete this.collinear;
    }
    const halfedges = this.halfedges = this._delaunator.halfedges;
    const hull = this.hull = this._delaunator.hull;
    const triangles = this.triangles = this._delaunator.triangles;
    const inedges = this.inedges.fill(-1);
    const hullIndex = this._hullIndex.fill(-1);
    for (let e = 0, n = halfedges.length; e < n; ++e) {
      const p = triangles[e % 3 === 2 ? e - 2 : e + 1];
      if (halfedges[e] === -1 || inedges[p] === -1) inedges[p] = e;
    }
    for (let i = 0, n = hull.length; i < n; ++i) {
      hullIndex[hull[i]] = i;
    }
    if (hull.length <= 2 && hull.length > 0) {
      this.triangles = new Int32Array(3).fill(-1);
      this.halfedges = new Int32Array(3).fill(-1);
      this.triangles[0] = hull[0];
      inedges[hull[0]] = 1;
      if (hull.length === 2) {
        inedges[hull[1]] = 0;
        this.triangles[1] = hull[1];
        this.triangles[2] = hull[1];
      }
    }
  }
  voronoi(bounds) {
    return new Voronoi(this, bounds);
  }
  *neighbors(i) {
    const { inedges, hull, _hullIndex, halfedges, triangles, collinear: collinear2 } = this;
    if (collinear2) {
      const l = collinear2.indexOf(i);
      if (l > 0) yield collinear2[l - 1];
      if (l < collinear2.length - 1) yield collinear2[l + 1];
      return;
    }
    const e0 = inedges[i];
    if (e0 === -1) return;
    let e = e0, p0 = -1;
    do {
      yield p0 = triangles[e];
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i) return;
      e = halfedges[e];
      if (e === -1) {
        const p = hull[(_hullIndex[i] + 1) % hull.length];
        if (p !== p0) yield p;
        return;
      }
    } while (e !== e0);
  }
  find(x, y, i = 0) {
    if ((x = +x, x !== x) || (y = +y, y !== y)) return -1;
    const i0 = i;
    let c;
    while ((c = this._step(i, x, y)) >= 0 && c !== i && c !== i0) i = c;
    return c;
  }
  _step(i, x, y) {
    const { inedges, hull, _hullIndex, halfedges, triangles, points } = this;
    if (inedges[i] === -1 || !points.length) return (i + 1) % (points.length >> 1);
    let c = i;
    let dc = pow(x - points[i * 2], 2) + pow(y - points[i * 2 + 1], 2);
    const e0 = inedges[i];
    let e = e0;
    do {
      let t = triangles[e];
      const dt = pow(x - points[t * 2], 2) + pow(y - points[t * 2 + 1], 2);
      if (dt < dc) dc = dt, c = t;
      e = e % 3 === 2 ? e - 2 : e + 1;
      if (triangles[e] !== i) break;
      e = halfedges[e];
      if (e === -1) {
        e = hull[(_hullIndex[i] + 1) % hull.length];
        if (e !== t) {
          if (pow(x - points[e * 2], 2) + pow(y - points[e * 2 + 1], 2) < dc) return e;
        }
        break;
      }
    } while (e !== e0);
    return c;
  }
  render(context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { points, halfedges, triangles } = this;
    for (let i = 0, n = halfedges.length; i < n; ++i) {
      const j = halfedges[i];
      if (j < i) continue;
      const ti = triangles[i] * 2;
      const tj = triangles[j] * 2;
      context.moveTo(points[ti], points[ti + 1]);
      context.lineTo(points[tj], points[tj + 1]);
    }
    this.renderHull(context);
    return buffer && buffer.value();
  }
  renderPoints(context, r) {
    if (r === void 0 && (!context || typeof context.moveTo !== "function")) r = context, context = null;
    r = r == void 0 ? 2 : +r;
    const buffer = context == null ? context = new Path() : void 0;
    const { points } = this;
    for (let i = 0, n = points.length; i < n; i += 2) {
      const x = points[i], y = points[i + 1];
      context.moveTo(x + r, y);
      context.arc(x, y, r, 0, tau);
    }
    return buffer && buffer.value();
  }
  renderHull(context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { hull, points } = this;
    const h = hull[0] * 2, n = hull.length;
    context.moveTo(points[h], points[h + 1]);
    for (let i = 1; i < n; ++i) {
      const h2 = 2 * hull[i];
      context.lineTo(points[h2], points[h2 + 1]);
    }
    context.closePath();
    return buffer && buffer.value();
  }
  hullPolygon() {
    const polygon = new Polygon();
    this.renderHull(polygon);
    return polygon.value();
  }
  renderTriangle(i, context) {
    const buffer = context == null ? context = new Path() : void 0;
    const { points, triangles } = this;
    const t0 = triangles[i *= 3] * 2;
    const t1 = triangles[i + 1] * 2;
    const t2 = triangles[i + 2] * 2;
    context.moveTo(points[t0], points[t0 + 1]);
    context.lineTo(points[t1], points[t1 + 1]);
    context.lineTo(points[t2], points[t2 + 1]);
    context.closePath();
    return buffer && buffer.value();
  }
  *trianglePolygons() {
    const { triangles } = this;
    for (let i = 0, n = triangles.length / 3; i < n; ++i) {
      yield this.trianglePolygon(i);
    }
  }
  trianglePolygon(i) {
    const polygon = new Polygon();
    this.renderTriangle(i, polygon);
    return polygon.value();
  }
};
function flatArray(points, fx, fy, that) {
  const n = points.length;
  const array = new Float64Array(n * 2);
  for (let i = 0; i < n; ++i) {
    const p = points[i];
    array[i * 2] = fx.call(that, p, i, points);
    array[i * 2 + 1] = fy.call(that, p, i, points);
  }
  return array;
}
function* flatIterable(points, fx, fy, that) {
  let i = 0;
  for (const p of points) {
    yield fx.call(that, p, i, points);
    yield fy.call(that, p, i, points);
    ++i;
  }
}

// scripts/gen-world.ts
var import_polygon_clipping = __toESM(require_polygon_clipping_cjs());

// src/data/provinces.ts
var TABLE = `
coruna;A Coru\xF1a;castile;2;0;-8.4;43.3;fish;europe
santiago;Santiago;castile;3;0;-8.5;42.75;cattle;europe
lugo;Lugo;castile;2;0;-7.55;43.0;cattle;europe
ourense;Ourense;castile;2;0;-7.85;42.3;wine;europe
oviedo;Oviedo;castile;2;0;-5.85;43.35;iron;europe
santander;Santander;castile;2;0;-4.0;43.25;fish;europe
bilbao;Biscay;castile;3;0;-2.95;43.2;iron;europe
sansebastian;Gipuzkoa;castile;2;0;-2.1;43.15;iron;europe
vitoria;\xC1lava;castile;2;0;-2.7;42.85;grain;europe
leon;Le\xF3n;castile;3;0;-5.6;42.6;cattle;europe
zamora;Zamora;castile;2;0;-5.9;41.65;grain;europe
salamanca;Salamanca;castile;3;0;-5.65;40.95;cattle;europe
valladolid;Valladolid;castile;4;1;-4.7;41.65;grain;europe
palencia;Palencia;castile;2;0;-4.5;42.2;grain;europe
burgos;Burgos;castile;3;1;-3.7;42.35;wool;europe
soria;Soria;castile;2;0;-2.45;41.75;wool;europe
logrono;La Rioja;castile;2;0;-2.45;42.4;wine;europe
segovia;Segovia;castile;3;0;-4.1;40.95;wool;europe
avila;\xC1vila;castile;2;0;-4.7;40.6;wool;europe
madrid;Madrid;castile;3;0;-3.7;40.4;grain;europe
toledo;Toledo;castile;4;1;-4.0;39.85;iron;europe
guadalajara;Guadalajara;castile;2;0;-2.9;40.75;grain;europe
cuenca;Cuenca;castile;2;0;-2.1;40.05;timber;europe
ciudadreal;La Mancha;castile;2;0;-3.4;39.0;wine;europe
albacete;Albacete;castile;2;0;-1.85;38.95;grain;europe
caceres;C\xE1ceres;castile;2;0;-6.4;39.45;cattle;europe
badajoz;Badajoz;castile;2;0;-6.65;38.75;cattle;europe
plasencia;Plasencia;castile;2;0;-5.9;40.1;cattle;europe
seville;Seville;castile;5;1;-5.95;37.4;oil;europe
cordoba;C\xF3rdoba;castile;3;0;-4.8;37.9;horses;europe
jaen;Ja\xE9n;castile;2;0;-3.8;37.75;oil;europe
huelva;Niebla;castile;2;0;-6.9;37.4;fish;europe
jerez;Jerez;castile;3;0;-6.05;36.65;wine;europe
murcia;Murcia;castile;3;0;-1.15;38.0;silk;europe
cartagena;Cartagena;castile;2;0;-1.05;37.6;salt;europe
granada;Granada;granada;4;2;-3.6;37.2;silk;europe
malaga;M\xE1laga;granada;3;1;-4.5;36.75;wine;europe
almeria;Almer\xEDa;granada;2;1;-2.45;36.95;silk;europe
porto;Porto;portugal;3;1;-8.55;41.15;wine;europe
braga;Minho;portugal;2;0;-8.4;41.65;cattle;europe
braganca;Tr\xE1s-os-Montes;portugal;2;0;-7.0;41.6;wine;europe
coimbra;Coimbra;portugal;3;0;-8.4;40.2;grain;europe
viseu;Beira;portugal;2;0;-7.4;40.6;timber;europe
lisbon;Lisbon;portugal;5;2;-9.1;38.75;salt;europe
evora;Alentejo;portugal;2;0;-7.9;38.55;grain;europe
faro;Algarve;portugal;2;0;-8.2;37.15;fish;europe
pamplona;Navarre;navarre;2;1;-1.65;42.8;grain;europe
zaragoza;Zaragoza;aragon;4;1;-0.9;41.65;grain;europe
huesca;Huesca;aragon;2;0;-0.4;42.15;wool;europe
teruel;Teruel;aragon;2;0;-1.1;40.35;wool;europe
barcelona;Barcelona;aragon;5;1;2.1;41.45;wool;europe
girona;Girona;aragon;2;0;2.8;42.0;cattle;europe
lleida;Lleida;aragon;2;0;0.7;41.75;grain;europe
tarragona;Tarragona;aragon;2;0;1.1;41.15;wine;europe
valencia;Valencia;aragon;4;0;-0.45;39.45;silk;europe
alicante;Alicante;aragon;2;0;-0.6;38.45;salt;europe
majorca;Majorca;aragon;2;0;2.95;39.6;oil;europe
cagliari;Cagliari;aragon;2;0;9.0;39.35;salt;europe
sassari;Sassari;aragon;1;0;8.7;40.6;silver;europe
palermo;Palermo;aragon;3;1;13.4;37.95;grain;europe
messina;Messina;aragon;2;0;15.2;38.05;silk;europe
syracuse;Syracuse;aragon;2;0;14.9;37.15;grain;europe
paris;Paris;france;6;2;2.35;48.85;grain;europe
rouen;Normandy;france;4;1;1.0;49.3;cattle;europe
caen;Lower Normandy;france;2;0;-0.6;49.1;cattle;europe
amiens;Picardy;france;3;0;2.3;49.9;grain;europe
reims;Champagne;france;3;0;4.0;49.2;wine;europe
orleans;Orl\xE9ans;france;3;0;1.9;47.9;grain;europe
tours;Touraine;france;3;0;0.7;47.4;wine;europe
angers;Anjou;france;2;0;-0.55;47.45;wine;europe
poitiers;Poitou;france;2;0;0.35;46.6;grain;europe
bordeaux;Guyenne;france;4;1;-0.6;44.85;wine;europe
bayonne;Gascony;france;2;0;-1.0;43.75;timber;europe
toulouse;Toulouse;france;3;0;1.45;43.6;grain;europe
montpellier;Languedoc;france;3;0;3.9;43.65;wine;europe
clermont;Auvergne;france;2;0;3.1;45.75;cattle;europe
limoges;Limousin;france;2;0;1.25;45.85;cattle;europe
bourges;Berry;france;2;0;2.4;47.05;wool;europe
lyon;Lyon;france;4;1;4.85;45.75;silk;europe
grenoble;Dauphin\xE9;france;2;0;5.75;45.2;timber;europe
marseille;Provence;france;3;1;5.4;43.45;oil;europe
rennes;Rennes;brittany;3;1;-1.7;48.1;cattle;europe
brest;Brest;brittany;2;0;-4.3;48.3;fish;europe
dijon;Burgundy;burgundy;4;1;5.0;47.3;wine;europe
besancon;Franche-Comt\xE9;burgundy;2;0;6.0;47.25;salt;europe
bruges;Flanders;burgundy;5;0;3.2;51.0;wool;europe
brussels;Brabant;burgundy;4;0;4.4;50.85;wool;europe
amsterdam;Holland;burgundy;3;0;4.8;52.35;fish;europe
arras;Artois;burgundy;2;0;2.8;50.3;grain;europe
luxembourg;Luxembourg;burgundy;2;1;6.1;49.6;iron;europe
calais;Calais;england;2;2;1.85;50.95;wool;europe
london;London;england;5;2;-0.1;51.5;wool;europe
winchester;Wessex;england;3;0;-1.9;51.0;wool;europe
exeter;Devon;england;2;0;-3.6;50.7;timber;europe
norwich;East Anglia;england;3;0;1.2;52.6;wool;europe
coventry;Midlands;england;3;0;-1.5;52.45;wool;europe
york;York;england;3;1;-1.1;53.95;wool;europe
durham;Northumbria;england;2;1;-1.6;54.9;iron;europe
lancaster;Lancashire;england;2;0;-2.7;53.8;cattle;europe
cardiff;Wales;england;2;0;-3.6;52.0;cattle;europe
dublin;The Pale;england;2;1;-6.3;53.35;cattle;europe
edinburgh;Edinburgh;scotland;3;1;-3.2;55.95;wool;europe
glasgow;Strathclyde;scotland;2;0;-4.6;55.75;fish;europe
inverness;Highlands;scotland;1;0;-4.5;57.3;timber;europe
cork;Munster;ireland;2;0;-8.5;52.0;cattle;europe
galway;Connacht;ireland;1;0;-9.0;53.4;cattle;europe
ulster;Ulster;ireland;1;0;-6.9;54.6;cattle;europe
copenhagen;Zealand;denmark;4;1;12.0;55.5;fish;europe
jutland;Jutland;denmark;3;0;9.2;56.2;cattle;europe
scania;Scania;denmark;3;0;13.4;55.85;grain;europe
oslo;Oslo;denmark;2;0;10.6;60.2;timber;europe
bergen;Bergen;denmark;2;0;6.3;60.6;fish;europe
trondheim;Tr\xF8ndelag;denmark;1;0;10.6;63.3;fish;europe
iceland;Iceland;denmark;1;0;-19.0;64.8;fish;europe
stockholm;Stockholm;sweden;3;1;17.6;59.7;iron;europe
gothenburg;G\xF6taland;sweden;2;0;14.0;57.8;timber;europe
norrland;Norrland;sweden;1;0;17.5;63.5;furs;europe
turku;Finland;sweden;2;0;23.3;61.0;furs;europe
lubeck;L\xFCbeck;hansa;4;1;10.4;53.85;fish;europe
hamburg;Hamburg;hansa;4;1;9.7;53.4;grain;europe
cologne;Cologne;cologne;4;1;7.0;50.9;wine;europe
heidelberg;Palatinate;palatinate;3;0;8.6;49.5;wine;europe
kassel;Hesse;hesse;2;0;9.4;51.1;timber;europe
stuttgart;W\xFCrttemberg;wurttemberg;3;0;9.2;48.75;wine;europe
luneburg;Brunswick;brunswick;3;0;10.2;52.6;salt;europe
berlin;Brandenburg;brandenburg;3;1;13.4;52.5;grain;europe
stettin;Pomerania;brandenburg;2;0;14.6;53.5;grain;europe
dresden;Saxony;saxony;3;1;13.6;51.0;silver;europe
erfurt;Thuringia;saxony;2;0;11.0;50.95;grain;europe
munich;Bavaria;bavaria;3;1;11.6;48.1;salt;europe
regensburg;Upper Palatinate;bavaria;2;0;12.1;49.0;iron;europe
vienna;Vienna;austria;5;2;16.4;48.2;wine;europe
graz;Styria;austria;3;1;15.4;47.1;iron;europe
innsbruck;Tyrol;austria;3;1;11.4;47.25;silver;europe
ljubljana;Carniola;austria;2;0;14.5;46.05;iron;europe
bern;Switzerland;swiss;3;1;7.5;46.95;cattle;europe
zurich;Zurich;swiss;3;0;8.55;47.35;cattle;europe
prague;Prague;bohemia;5;1;14.4;50.1;silver;europe
brno;Moravia;bohemia;3;0;16.6;49.2;grain;europe
breslau;Silesia;bohemia;3;0;17.0;51.1;grain;europe
turin;Piedmont;savoy;3;1;7.7;45.05;grain;europe
chambery;Savoy;savoy;2;1;5.9;45.55;cattle;europe
milan;Milan;milan;5;1;9.2;45.45;iron;europe
parma;Parma;milan;3;0;10.3;44.8;cattle;europe
genoa;Genoa;genoa;4;1;8.95;44.4;fish;europe
corsica;Corsica;genoa;1;0;9.1;42.15;timber;europe
venice;Venice;venice;5;2;12.3;45.45;salt;europe
verona;Verona;venice;3;0;11.0;45.45;wool;europe
zara;Dalmatia;venice;2;0;15.8;43.9;timber;europe
candia;Crete;venice;2;1;24.9;35.25;wine;europe
florence;Florence;florence;5;0;11.25;43.75;wool;europe
pisa;Pisa;florence;2;0;10.5;43.6;fish;europe
rome;Rome;papacy;5;1;12.5;41.9;wine;europe
bologna;Romagna;papacy;3;0;11.6;44.4;grain;europe
ancona;Marche;papacy;2;0;13.3;43.45;grain;europe
perugia;Umbria;papacy;2;0;12.4;43.05;oil;europe
naples;Naples;naples;5;1;14.25;40.85;silk;europe
abruzzo;Abruzzo;naples;2;0;13.9;42.2;wool;europe
bari;Apulia;naples;3;0;16.6;41.0;oil;europe
cosenza;Calabria;naples;2;0;16.25;39.2;silk;europe
krakow;Krak\xF3w;poland;4;1;19.9;50.05;salt;europe
warsaw;Masovia;poland;3;0;21.0;52.25;grain;europe
poznan;Greater Poland;poland;3;0;16.9;52.4;grain;europe
lviv;Red Ruthenia;poland;2;0;24.0;49.85;grain;europe
vilnius;Vilnius;lithuania;3;1;25.3;54.7;timber;europe
minsk;Minsk;lithuania;2;0;27.55;53.9;timber;russia
kiev;Kiev;lithuania;3;0;30.5;50.45;grain;russia
smolensk;Smolensk;lithuania;2;1;32.05;54.8;timber;russia
lutsk;Volhynia;lithuania;2;0;25.3;50.75;grain;europe
danzig;Danzig;teutonic;3;1;18.65;54.35;grain;europe
konigsberg;Prussia;teutonic;2;1;20.5;54.7;grain;europe
riga;Livonia;teutonic;2;1;24.1;56.95;furs;europe
buda;Buda;hungary;5;1;19.05;47.5;wine;europe
pressburg;Upper Hungary;hungary;3;0;18.5;48.6;silver;europe
kolozsvar;Transylvania;hungary;3;1;23.6;46.75;gold;europe
zagreb;Croatia;hungary;2;0;16.0;45.8;timber;europe
temesvar;Banat;hungary;2;1;21.2;45.75;grain;europe
moscow;Moscow;muscovy;4;1;37.6;55.75;furs;russia
ryazan;Ryazan;muscovy;2;0;39.7;54.6;grain;russia
nizhny;Nizhny Novgorod;muscovy;2;0;44.0;56.3;furs;russia
vologda;Vologda;muscovy;1;0;39.9;59.2;furs;russia
novgorod;Novgorod;novgorod;3;1;31.3;58.5;furs;russia
pskov;Pskov;novgorod;2;1;28.35;57.8;timber;russia
dvina;Dvina;novgorod;1;0;40.5;64.5;furs;russia
kazan;Kazan;kazan;2;1;49.1;55.8;furs;russia
astrakhan;Sarai;horde;2;0;46.0;47.0;horses;russia
crimea;Crimea;crimea;2;1;34.1;44.95;horses;russia
suceava;Moldavia;moldavia;2;1;26.25;47.65;cattle;europe
tirgoviste;Wallachia;wallachia;2;1;25.45;44.9;grain;europe
bosnia;Bosnia;bosnia;2;1;18.0;44.0;silver;europe
belgrade;Serbia;serbia;2;1;20.9;44.0;silver;europe
kruja;Albania;albania;1;1;19.8;41.5;wool;europe
constantinople;Constantinople;byzantium;6;3;28.95;41.05;silk;europe
mistra;Morea;byzantium;2;1;22.4;37.25;oil;europe
edirne;Thrace;ottomans;4;1;26.55;41.7;grain;europe
thessaloniki;Macedonia;ottomans;3;1;22.95;40.65;grain;europe
sofia;Bulgaria;ottomans;3;0;23.3;42.7;grain;europe
athens;Greece;ottomans;2;0;22.4;39.3;oil;europe
bursa;Bursa;ottomans;4;1;29.05;40.2;silk;middle_east
izmir;Ayd\u0131n;ottomans;3;0;27.4;38.45;oil;middle_east
ankara;Ankara;ottomans;3;1;32.85;39.95;wool;middle_east
sivas;Sivas;ottomans;2;0;37.0;39.75;horses;middle_east
konya;Konya;karaman;3;1;32.5;37.85;wool;middle_east
adana;Cilicia;karaman;2;0;35.3;37.0;cotton;middle_east
trebizond;Trebizond;trebizond;3;2;39.7;41.0;silk;middle_east
tbilisi;Georgia;georgia;2;1;44.8;41.7;wine;middle_east
cyprus;Cyprus;cyprus;2;1;33.3;35.1;sugar;middle_east
cairo;Cairo;mamluks;6;2;31.25;30.05;grain;north_africa
alexandria;Alexandria;mamluks;4;1;29.9;31.15;cotton;north_africa
aswan;Upper Egypt;mamluks;2;0;32.8;25.7;grain;north_africa
barqa;Cyrenaica;mamluks;1;0;21.8;32.3;horses;north_africa
jerusalem;Palestine;mamluks;3;1;35.2;31.75;oil;middle_east
damascus;Damascus;mamluks;4;1;36.3;33.5;silk;middle_east
aleppo;Aleppo;mamluks;4;1;37.15;36.2;cotton;middle_east
mecca;Hejaz;mamluks;3;0;39.8;21.45;spices;middle_east
diyarbakir;Diyarbak\u0131r;aqqoyunlu;3;1;40.2;37.9;wool;middle_east
mosul;Mosul;aqqoyunlu;2;0;43.1;36.35;cotton;middle_east
tabriz;Tabriz;qaraqoyunlu;4;1;46.3;38.05;silk;middle_east
baghdad;Baghdad;qaraqoyunlu;4;1;44.4;33.3;grain;middle_east
isfahan;Isfahan;qaraqoyunlu;4;0;51.65;32.65;silk;middle_east
shiraz;Fars;qaraqoyunlu;3;0;52.55;29.6;wine;middle_east
herat;Herat;timurids;4;1;62.2;34.35;silk;central_asia
mashhad;Khorasan;timurids;3;0;59.6;36.3;horses;central_asia
samarkand;Samarkand;timurids;5;1;66.95;39.65;silk;central_asia
bukhara;Bukhara;timurids;3;0;64.4;39.8;cotton;central_asia
kandahar;Kandahar;timurids;2;0;65.7;31.6;horses;central_asia
kazakh;Kazakh Steppe;uzbeks;1;0;68.0;47.0;horses;central_asia
hormuz;Hormuz;hormuz;3;1;56.3;27.2;spices;middle_east
muscat;Oman;oman;2;0;58.4;23.6;fish;middle_east
yemen;Yemen;yemen;2;0;44.2;15.35;spices;middle_east
najd;Najd;bedouins;1;0;46.7;24.6;horses;middle_east
fez;Fez;morocco;4;1;-5.0;34.05;wool;north_africa
marrakesh;Marrakesh;morocco;3;1;-8.0;31.6;sugar;north_africa
tangier;Tangier;morocco;2;1;-5.8;35.5;fish;north_africa
agadir;Sous;morocco;1;0;-9.5;30.4;sugar;north_africa
ceuta;Ceuta;portugal;1;2;-5.35;35.85;fish;north_africa
tlemcen;Tlemcen;tlemcen;3;1;-1.3;34.9;wool;north_africa
oran;Oran;tlemcen;2;0;-0.65;35.65;grain;north_africa
algiers;Algiers;tlemcen;2;0;3.05;36.7;fish;north_africa
tunis;Tunis;tunis;4;1;10.15;36.75;oil;north_africa
constantine;Constantine;tunis;2;0;6.6;36.3;grain;north_africa
bejaia;B\xE9ja\xEFa;tunis;2;0;5.05;36.7;timber;north_africa
kairouan;Kairouan;tunis;2;0;10.1;35.6;oil;north_africa
tripoli;Tripoli;tunis;2;1;13.2;32.85;salt;north_africa
fezzan;Fezzan;tribes;1;0;14.4;26.0;salt;north_africa
madeira;Madeira;portugal;1;0;-16.95;32.7;sugar;atlantic
azores;Azores;portugal;1;0;-25.6;37.8;grain;atlantic
canaries;Canary Islands;natives;1;0;-15.5;28.1;sugar;atlantic
`;
var TABLE_WORLD = `
capeverde;Cape Verde;natives;1;0;-23.6;15.1;salt;west_africa
jolof;Jolof;jolof;2;0;-15.5;15.5;cattle;west_africa
timbuktu;Timbuktu;mali;3;0;-3.0;16.8;gold;west_africa
niani;Mali;mali;3;1;-9.0;11.5;gold;west_africa
gao;Songhai;songhai;3;1;0.0;16.3;gold;west_africa
elmina;Gold Coast;natives;1;0;-1.4;6.0;gold;west_africa
benin;Benin;benin;2;1;5.6;6.4;ivory;west_africa
kano;Hausa;hausa;3;1;8.5;12.0;cotton;west_africa
bornu;Bornu;bornu;2;1;13.2;12.0;ivory;west_africa
kongo;Kongo;kongo;3;1;14.3;-5.0;ivory;central_africa
ndongo;Ndongo;natives;1;0;15.5;-9.5;ivory;central_africa
lunda;Congo Basin;natives;1;0;22.5;-3.0;ivory;central_africa
cape;The Cape;natives;1;0;19.5;-33.0;cattle;southern_africa
mutapa;Mutapa;mutapa;2;0;31.0;-17.5;gold;southern_africa
sofala;Sofala;natives;1;0;34.8;-19.8;gold;southern_africa
madagascar;Madagascar;natives;1;0;46.8;-19.0;cattle;southern_africa
kilwa;Kilwa;kilwa;3;0;39.3;-8.95;ivory;east_africa
mombasa;Mombasa;kilwa;2;0;39.5;-3.5;spices;east_africa
amhara;Amhara;ethiopia;3;1;38.5;11.6;grain;east_africa
tigray;Tigray;ethiopia;2;0;39.0;14.0;cattle;east_africa
harar;Adal;adal;2;0;42.1;9.3;cattle;east_africa
nubia;Nubia;tribes;1;0;32.5;16.0;gold;east_africa
mogadishu;Mogadishu;natives;1;0;44.6;3.5;cattle;east_africa
delhi;Delhi;delhi;5;1;77.2;28.65;cotton;india
lahore;Punjab;delhi;3;0;74.3;31.55;grain;india
jaunpur;Jaunpur;jaunpur;3;0;82.7;25.75;grain;india
gaur;Bengal;bengal;5;0;88.4;24.0;silk;india
ahmedabad;Gujarat;gujarat;4;1;72.6;23.0;cotton;india
mandu;Malwa;malwa;3;1;75.4;22.5;cotton;india
chittor;Mewar;mewar;2;2;74.6;24.9;horses;india
thatta;Sindh;sindh;2;0;68.0;25.5;cotton;india
srinagar;Kashmir;kashmir;2;0;74.8;34.1;wool;india
bidar;Bahmani;bahmani;4;1;77.5;17.9;cotton;india
goa;Goa;bahmani;2;0;74.0;15.5;spices;india
hampi;Vijayanagara;vijayanagara;5;2;76.5;15.3;gold;india
coromandel;Coromandel;vijayanagara;3;0;79.8;12.5;cotton;india
calicut;Calicut;calicut;3;0;75.8;11.25;spices;india
cuttack;Orissa;orissa;3;1;85.9;20.5;grain;india
kotte;Ceylon;kotte;2;0;80.6;7.3;spices;india
beijing;Beijing;ming;6;2;116.4;39.9;silk;china
nanjing;Nanjing;ming;6;1;118.8;32.05;silk;china
hangzhou;Zhejiang;ming;5;0;120.15;29.5;silk;china
fuzhou;Fujian;ming;4;0;118.0;26.0;porcelain;china
guangzhou;Guangdong;ming;5;1;113.25;23.5;porcelain;china
wuhan;Huguang;ming;4;0;113.0;29.5;grain;china
chengdu;Sichuan;ming;4;0;104.0;30.6;silk;china
xian;Shaanxi;ming;4;1;108.9;34.3;grain;china
kunming;Yunnan;ming;2;0;102.7;25.05;silver;china
liaodong;Manchuria;jurchens;1;0;125.0;43.0;furs;china
karakorum;Mongolia;mongols;1;0;102.8;47.2;horses;china
lhasa;Tibet;tibet;2;0;91.1;29.65;wool;china
kashgar;Kashgar;mongols;1;0;76.0;39.5;horses;central_asia
hanseong;Korea;korea;4;1;127.0;37.55;grain;china
pyongyang;North Korea;korea;2;1;125.75;39.0;iron;china
kyoto;Kyoto;japan;5;1;135.75;35.0;silk;china
edo;Kanto;japan;3;1;139.7;35.7;grain;china
hakata;Kyushu;japan;3;1;130.4;33.6;silver;china
hanoi;Dai Viet;daiviet;4;1;105.85;21.0;grain;east_indies
champa;Champa;champa;2;0;108.5;14.0;spices;east_indies
angkor;Khmer;khmer;3;1;104.9;12.5;grain;east_indies
ayutthaya;Ayutthaya;ayutthaya;4;1;100.55;14.35;grain;east_indies
ava;Burma;ava;3;1;96.0;21.9;timber;east_indies
malacca;Malacca;malacca;3;1;102.25;2.3;spices;east_indies
pasai;Sumatra;natives;2;0;101.5;0.0;spices;east_indies
java;Java;majapahit;4;1;110.5;-7.4;spices;east_indies
brunei;Borneo;brunei;2;0;114.9;1.5;spices;east_indies
ternate;Maluku;ternate;2;0;127.6;-0.2;spices;east_indies
luzon;Philippines;natives;1;0;121.0;15.5;spices;east_indies
tobolsk;Siberia;natives;1;0;68.25;58.2;furs;siberia
yakutsk;Yakutia;natives;1;0;129.7;62.0;furs;siberia
okhotsk;Far East;natives;1;0;140.0;55.0;furs;siberia
cuba;Cuba;natives;1;0;-79.5;21.8;sugar;caribbean
hispaniola;Hispaniola;natives;2;0;-71.0;19.0;sugar;caribbean
jamaica;Jamaica;natives;1;0;-77.3;18.1;sugar;caribbean
florida;Florida;natives;1;0;-81.7;28.5;furs;north_america
carolina;Carolinas;natives;1;0;-79.5;35.0;cotton;north_america
virginia;Chesapeake;natives;1;0;-77.0;38.0;timber;north_america
newengland;New England;natives;1;0;-71.5;42.5;fish;north_america
quebec;St Lawrence;natives;1;0;-71.5;47.0;furs;north_america
lakes;Great Lakes;natives;1;0;-84.0;44.0;furs;north_america
cahokia;Mississippi;natives;1;0;-90.2;38.6;grain;north_america
plains;Great Plains;natives;1;0;-100.0;41.0;cattle;north_america
texas;Texas;natives;1;0;-98.0;31.0;cattle;north_america
california;California;natives;1;0;-120.0;37.0;gold;north_america
oregon;Oregon;natives;1;0;-122.5;45.5;timber;north_america
hudson;Hudson Bay;natives;1;0;-95.0;56.0;furs;north_america
alaska;Alaska;natives;1;0;-150.0;63.0;furs;north_america
tenochtitlan;Tenochtitlan;aztec;5;2;-99.1;19.4;gold;mexico
veracruz;Veracruz;aztec;3;0;-96.6;19.2;cotton;mexico
oaxaca;Oaxaca;aztec;3;0;-96.7;17.05;silver;mexico
michoacan;Michoac\xE1n;tarascan;3;1;-101.6;19.6;silver;mexico
chichimeca;Chichimeca;natives;1;0;-103.0;24.0;silver;mexico
yucatan;Yucat\xE1n;maya;2;0;-89.0;20.5;cotton;mexico
guatemala;Guatemala;maya;2;0;-90.5;15.0;cotton;mexico
panama;Panama;natives;1;0;-80.0;8.5;gold;andes
muisca;New Granada;natives;2;0;-74.1;5.0;gold;andes
venezuela;Venezuela;natives;1;0;-67.0;9.0;cattle;andes
quito;Quito;inca;3;1;-78.5;-0.2;gold;andes
chanchan;Chimor;chimor;3;1;-78.0;-8.5;cotton;andes
cusco;Cusco;inca;5;2;-72.0;-13.5;gold;andes
potosi;Charcas;inca;2;0;-65.75;-19.6;silver;andes
chile;Chile;natives;1;0;-71.0;-34.0;gold;andes
guiana;Guiana;natives;1;0;-57.0;5.0;sugar;brazil
pernambuco;Pernambuco;natives;1;0;-36.5;-8.0;sugar;brazil
bahia;Bahia;natives;1;0;-40.0;-12.5;sugar;brazil
rio;Rio de Janeiro;natives;1;0;-43.5;-22.5;sugar;brazil
saopaulo;S\xE3o Paulo;natives;1;0;-47.5;-23.0;cattle;brazil
amazon;Amazonia;natives;1;0;-60.0;-4.0;timber;brazil
paraguay;Paraguay;natives;1;0;-57.5;-24.0;cattle;plata
plata;R\xEDo de la Plata;natives;1;0;-60.0;-33.5;cattle;plata
patagonia;Patagonia;natives;1;0;-68.0;-44.0;cattle;plata
sydney;New South Wales;natives;1;0;150.0;-31.0;cattle;oceania
perth;Western Australia;natives;1;0;117.0;-28.0;gold;oceania
outback;Australia;natives;1;0;134.0;-24.0;cattle;oceania
newzealand;New Zealand;natives;1;0;175.0;-39.0;timber;oceania
`;
function parseTable(t) {
  return t.trim().split("\n").filter((l) => l.trim() && !l.startsWith("#")).map((l) => {
    const [id, name, owner2, dev, fort, lon, lat, good, region] = l.split(";");
    return { id, name, owner: owner2, dev: +dev, fort: +fort, lon: +lon, lat: +lat, good, region };
  });
}
var SEEDS_EUROPE = () => parseTable(TABLE);
var SEEDS_WORLD_EXTRA = () => parseTable(TABLE_WORLD);

// scripts/gen-world.ts
function dpRing(r, tol) {
  let far = 1, fd = -1;
  for (let i = 1; i < r.length - 1; i++) {
    const d = Math.hypot(r[i][0] - r[0][0], r[i][1] - r[0][1]);
    if (d > fd) {
      fd = d;
      far = i;
    }
  }
  const a = dp(r.slice(0, far + 1), tol), b = dp(r.slice(far), tol);
  return [...a, ...b.slice(1)];
}
var area = (r) => Math.abs(r.reduce((a, [x, y], i) => {
  const [x2, y2] = r[(i + 1) % r.length];
  return a + x * y2 - x2 * y;
}, 0) / 2);
var inRing = (p, r) => {
  let c = false;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) {
    const [xi, yi] = r[i], [xj, yj] = r[j];
    if (yi > p[1] !== yj > p[1] && p[0] < (xj - xi) * (p[1] - yi) / (yj - yi) + xi) c = !c;
  }
  return c;
};
var inPoly = (p, poly) => inRing(p, poly[0]) && !poly.slice(1).some((h) => inRing(p, h));
var S = 10;
var rad = (d) => d * Math.PI / 180;
var miller = (lat) => 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * rad(lat))) * 180 / Math.PI;
var LAT_TOP = 76;
var LAT_BOT = -57;
var YTOP = miller(LAT_TOP);
var proj = ([lon, lat]) => [(lon + 180) * S, (YTOP - miller(Math.max(LAT_BOT, Math.min(LAT_TOP, lat)))) * S];
var W = 360 * S;
var H = (YTOP - miller(LAT_BOT)) * S;
var topo = JSON.parse((0, import_node_fs.readFileSync)("node_modules/world-atlas/land-50m.json", "utf8"));
var geo = (0, import_topojson_client.feature)(topo, topo.objects.land);
var polys = [];
for (const f of geo.features ?? [geo]) {
  const g = f.geometry;
  const list = g.type === "Polygon" ? [g.coordinates] : g.coordinates;
  for (const p of list) polys.push(p.map((r) => r.map(([x, y]) => [x, y])));
}
polys = polys.filter((p) => Math.max(...p[0].map((q) => q[1])) > -60);
var AFRICA_MASK = [
  [-30, -45],
  [60, -45],
  [60, 11.5],
  [43.45, 12.6],
  [42.5, 14],
  [40.5, 16.5],
  [38.5, 20],
  [36.5, 24],
  [34.6, 27.4],
  [33.2, 28.6],
  [32.56, 29.95],
  [32.35, 30.6],
  [32.3, 31.35],
  [32.2, 31.8],
  [28, 32.4],
  [25, 32.9],
  [20, 33.6],
  [12, 34.2],
  [11.3, 37.5],
  [9, 37.6],
  [3, 37],
  [-2, 36.2],
  [-5, 35.97],
  [-6, 35.88],
  [-12, 35.6],
  [-30, 36],
  [-30, -45]
];
var out = [];
for (const p of polys) {
  const xs = p[0].map((q) => q[0]), ys = p[0].map((q) => q[1]);
  const big = Math.max(...xs) - Math.min(...xs) > 40;
  if (!big) {
    out.push(p);
    continue;
  }
  const inter = import_polygon_clipping.default.intersection(p, [AFRICA_MASK]);
  const diff = import_polygon_clipping.default.difference(p, [AFRICA_MASK]);
  out.push(...inter, ...diff);
}
polys = out;
polys = polys.flatMap((p) => {
  const xs = p[0].map((q) => q[0]);
  if (Math.max(...xs) - Math.min(...xs) < 300) return [p];
  return import_polygon_clipping.default.intersection(p, [[[-30, -90], [180, -90], [180, 90], [-30, 90], [-30, -90]]]);
});
polys = polys.flatMap((p) => import_polygon_clipping.default.intersection(p, [[[-180, LAT_BOT + 0.5], [180, LAT_BOT + 0.5], [180, LAT_TOP - 0.5], [-180, LAT_TOP - 0.5], [-180, LAT_BOT + 0.5]]]));
function dp(pts, tol) {
  if (pts.length < 4) return pts;
  const keep = new Uint8Array(pts.length);
  keep[0] = keep[pts.length - 1] = 1;
  const stack = [[0, pts.length - 1]];
  while (stack.length) {
    const [a, b] = stack.pop();
    let best = -1, bi = -1;
    const [ax, ay] = pts[a], [bx, by] = pts[b];
    const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy) || 1e-9;
    for (let i = a + 1; i < b; i++) {
      const d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + bx * ay - by * ax) / L;
      if (d > best) {
        best = d;
        bi = i;
      }
    }
    if (best > tol) {
      keep[bi] = 1;
      stack.push([a, bi], [bi, b]);
    }
  }
  return pts.filter((_, i) => keep[i]);
}
var seeds = [...SEEDS_EUROPE(), ...SEEDS_WORLD_EXTRA()];
var ids = /* @__PURE__ */ new Set();
for (const s of seeds) {
  if (ids.has(s.id)) throw new Error("duplicate id " + s.id);
  ids.add(s.id);
}
var europe = (lon, lat) => lon > -12 && lon < 45 && lat > 30 && lat < 62;
polys = polys.map((p) => p.map((r, ri) => {
  const [x, y] = r[0];
  const tol = europe(x, y) ? 0.06 : 0.18;
  return dpRing(r, ri ? tol * 2 : tol);
}).filter((r, ri) => r.length >= 4 && (ri === 0 || area(r) > 0.3))).filter((p) => p.length && p[0].length >= 4);
var owner = /* @__PURE__ */ new Map();
for (const s of seeds) {
  let idx = polys.findIndex((p) => inPoly([s.lon, s.lat], p));
  if (idx < 0) {
    search: for (let r = 0.1; r <= 1.2; r += 0.1) for (let a = 0; a < 360; a += 15) {
      const q = [s.lon + r * Math.cos(rad(a)), s.lat + r * Math.sin(rad(a))];
      const k = polys.findIndex((p) => inPoly(q, p));
      if (k >= 0) {
        console.warn(`nudged ${s.id} by ${r.toFixed(1)}\xB0`);
        s.lon = +q[0].toFixed(2);
        s.lat = +q[1].toFixed(2);
        idx = k;
        break search;
      }
    }
  }
  if (idx < 0) {
    const ring = [];
    for (let a = 0; a <= 360; a += 45) ring.push([s.lon + 0.45 * Math.cos(rad(a)), s.lat + 0.35 * Math.sin(rad(a))]);
    polys.push([ring]);
    idx = polys.length - 1;
    console.warn("island drawn for " + s.id);
  }
  owner.set(s.id, idx);
}
var used = new Set(owner.values());
var width = (p) => {
  const xs = p[0].map((q) => q[0]);
  return Math.max(...xs) - Math.min(...xs);
};
var keepIdx = polys.map((p, i) => used.has(i) || area(p[0]) > 0.8 && width(p) < 120);
var remap = /* @__PURE__ */ new Map();
var lands = [];
polys.forEach((p, i) => {
  if (keepIdx[i]) {
    remap.set(i, lands.length);
    lands.push(p);
  }
});
for (const [k, v2] of owner) owner.set(k, remap.get(v2));
var fmt = (pts) => "M" + pts.map((q) => {
  const [x, y] = proj(q);
  return x.toFixed(1) + "," + y.toFixed(1);
}).join("L") + "Z";
var fmtXY = (pts) => "M" + pts.map(([x, y]) => x.toFixed(1) + "," + y.toFixed(1)).join("L") + "Z";
var landPaths = lands.map((p) => p.map(fmt).join(""));
var landXY = lands.map((p) => p.map((r) => r.map(proj)));
var inPolyXY = (q, poly) => inRing(q, poly[0]) && !poly.slice(1).some((h) => inRing(q, h));
var cells = {};
var center = {};
var landOf = {};
var adj = {};
var coastal = {};
for (const s of seeds) {
  adj[s.id] = [];
  center[s.id] = proj([s.lon, s.lat]).map((v2) => +v2.toFixed(1));
  landOf[s.id] = owner.get(s.id);
}
var byLand = /* @__PURE__ */ new Map();
for (const s of seeds) {
  const k = owner.get(s.id);
  if (!byLand.has(k)) byLand.set(k, []);
  byLand.get(k).push(s.id);
}
for (const [k, list] of byLand) {
  const poly = landXY[k];
  if (list.length === 1) {
    cells[list[0]] = landPaths[k];
    coastal[list[0]] = true;
    continue;
  }
  const xs = poly[0].map((q) => q[0]), ys = poly[0].map((q) => q[1]);
  const vor = Delaunay.from(list.map((id) => center[id])).voronoi([Math.min(...xs) - 20, Math.min(...ys) - 20, Math.max(...xs) + 20, Math.max(...ys) + 20]);
  const cps = list.map((_, i) => vor.cellPolygon(i) ?? []);
  list.forEach((id, i) => {
    cells[id] = fmtXY(cps[i]);
    coastal[id] = false;
  });
  const del = vor.delaunay;
  let hint = 0;
  for (const ring of poly) for (let e = 0; e < ring.length - 1; e++) {
    const [x0, y0] = ring[e], [x1, y1] = ring[e + 1];
    const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 3));
    for (let t = 0; t < n; t++) {
      hint = del.find(x0 + (x1 - x0) * t / n, y0 + (y1 - y0) * t / n, hint);
      coastal[list[hint]] = true;
    }
  }
  list.forEach((id, i) => {
    for (const j of vor.neighbors(i)) {
      if (j < i) continue;
      const a = cps[i], b = cps[j];
      const shared = a.filter((p) => b.some((q) => Math.abs(p[0] - q[0]) < 0.01 && Math.abs(p[1] - q[1]) < 0.01));
      if (shared.length < 2) continue;
      const [s0, s1] = shared;
      let hits = 0;
      for (let t = 0; t <= 24; t++) if (inPolyXY([s0[0] + (s1[0] - s0[0]) * t / 24, s0[1] + (s1[1] - s0[1]) * t / 24], poly)) hits++;
      if (hits >= 1) {
        adj[id].push(list[j]);
        adj[list[j]].push(id);
      }
    }
  });
}
var sea = {};
for (const s of seeds) sea[s.id] = [];
var coastIds = seeds.filter((s) => coastal[s.id]);
var boxes = landXY.map((p) => {
  const xs = p[0].map((q) => q[0]), ys = p[0].map((q) => q[1]);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
});
var onLand = (q) => landXY.some((p, i) => q[0] >= boxes[i][0] && q[0] <= boxes[i][2] && q[1] >= boxes[i][1] && q[1] <= boxes[i][3] && inPolyXY(q, p));
var seaOk = (a, b, max = 7) => {
  const [ax, ay] = center[a.id], [bx, by] = center[b.id];
  let land = 0;
  for (let t = 1; t < 16; t++) if (onLand([ax + (bx - ax) * t / 16, ay + (by - ay) * t / 16])) land++;
  return land <= max;
};
var link = (a, b) => {
  if (!sea[a].includes(b)) {
    sea[a].push(b);
    sea[b].push(a);
  }
};
var dist2 = (a, b) => Math.hypot((a.lon - b.lon) * Math.cos(rad((a.lat + b.lat) / 2)), a.lat - b.lat);
for (let i = 0; i < coastIds.length; i++) for (let j = i + 1; j < coastIds.length; j++) {
  const a = coastIds[i], b = coastIds[j];
  if (adj[a.id].includes(b.id) || dist2(a, b) > 4) continue;
  if (seaOk(a, b, 5)) link(a.id, b.id);
}
for (const a of coastIds) {
  const other = coastIds.filter((b) => b !== a && landOf[b.id] !== landOf[a.id] && !sea[a.id].includes(b.id)).map((b) => [dist2(a, b), b]).sort((x, y) => x[0] - y[0]);
  const have = sea[a.id].filter((b) => landOf[b] !== landOf[a.id]).length;
  const lonely = !adj[a.id].length && sea[a.id].length < 2;
  for (const [d, b] of other.slice(0, lonely ? 2 : Math.max(0, 1 - have))) if (lonely ? d < 26 && seaOk(a, b, 13) : d < 12 && seaOk(a, b)) link(a.id, b.id);
}
for (const id of ["seville", "bordeaux", "nantes", "london", "hamburg", "rouen"]) if (id in coastal) coastal[id] = true;
var world = { W: +W.toFixed(1), H: +H.toFixed(1), lands: landPaths, cells, center, land: landOf, adj, sea, coastal, seeds };
(0, import_node_fs.writeFileSync)("src/data/world.json", JSON.stringify(world));
console.log(`lands ${lands.length}, provinces ${seeds.length}, size ${(JSON.stringify(world).length / 1024).toFixed(0)} KB, map ${W}x${H.toFixed(0)}`);
var isolated = seeds.filter((s) => !adj[s.id].length && !sea[s.id].length).map((s) => s.id);
if (isolated.length) console.log("isolated:", isolated.join(", "));
var count = {};
for (const s of seeds) count[s.owner] = (count[s.owner] ?? 0) + 1;
console.log("castile", count.castile, "portugal", count.portugal, "aragon", count.aragon, "nations", Object.keys(count).length);
