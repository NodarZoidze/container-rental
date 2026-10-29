// Minimal runtime for the prototype's template format.
// Template syntax: {{ path }} holes (dotted lookups), <sc-if value>, <sc-for list as>,
// onClick / onChange handlers and inline style strings. Rendered with React.
import { createElement as h, Fragment, useEffect, useReducer } from 'react';

export class DCLogic {
  constructor(props) {
    this.props = props || {};
    this.state = null;
    this._subs = new Set();
  }
  setState(patch) {
    this.state = Object.assign({}, this.state || {}, patch);
    this._subs.forEach(function (fn) { fn(); });
  }
  subscribe(fn) {
    this._subs.add(fn);
    var subs = this._subs;
    return function () { subs.delete(fn); };
  }
}

var HOLE = /\{\{\s*([^}]+?)\s*\}\}/g;
var SKIP_ATTR = /^hint-/;
var ATTR_MAP = {
  class: 'className', for: 'htmlFor', onclick: 'onClick', onchange: 'onChange', oninput: 'onInput',
  inputmode: 'inputMode', autocomplete: 'autoComplete', tabindex: 'tabIndex', readonly: 'readOnly',
  maxlength: 'maxLength', spellcheck: 'spellCheck', autofocus: 'autoFocus', viewbox: 'viewBox',
  'stroke-width': 'strokeWidth', 'stroke-linecap': 'strokeLinecap', 'stroke-linejoin': 'strokeLinejoin',
  'fill-rule': 'fillRule', 'clip-rule': 'clipRule'
};
var BOOL_PROPS = { disabled: 1, checked: 1, readOnly: 1, hidden: 1, autoFocus: 1, multiple: 1 };

function parseParts(str) {
  var parts = [], last = 0, m;
  HOLE.lastIndex = 0;
  while ((m = HOLE.exec(str))) {
    if (m.index > last) parts.push(str.slice(last, m.index));
    parts.push({ p: m[1].trim() });
    last = HOLE.lastIndex;
  }
  if (last < str.length) parts.push(str.slice(last));
  return parts;
}

function compileNode(node) {
  if (node.nodeType === 3) {
    var t = node.nodeValue;
    if (!t.trim() && t.indexOf('\n') >= 0) return null; // indentation only
    return { k: 'text', parts: parseParts(t) };
  }
  if (node.nodeType !== 1) return null;
  var tag = node.localName;
  var children = compileChildren(node);
  if (tag === 'sc-if') return { k: 'if', v: parseParts(node.getAttribute('value') || ''), children: children };
  if (tag === 'sc-for') return { k: 'for', list: parseParts(node.getAttribute('list') || ''), as: node.getAttribute('as') || 'item', children: children };
  var attrs = [];
  for (var i = 0; i < node.attributes.length; i++) {
    var a = node.attributes[i];
    if (SKIP_ATTR.test(a.name)) continue;
    var name = ATTR_MAP[a.name] || a.name;
    attrs.push({ name: name, parts: parseParts(a.value) });
  }
  return { k: 'el', tag: tag, attrs: attrs, children: children };
}

function compileChildren(node) {
  var out = [];
  node.childNodes.forEach(function (c) { var x = compileNode(c); if (x) out.push(x); });
  return out;
}

export function compileTemplate(src) {
  var doc = new DOMParser().parseFromString('<!doctype html><html><body>' + src + '</body></html>', 'text/html');
  return compileChildren(doc.body);
}

function lookup(scope, path) {
  if (path === 'true') return true;
  if (path === 'false') return false;
  var segs = path.split('.'), v = scope;
  for (var i = 0; i < segs.length; i++) {
    if (v == null) return undefined;
    v = v[segs[i]];
  }
  return v;
}

function evalParts(parts, scope) {
  if (parts.length === 1 && typeof parts[0] === 'object') return lookup(scope, parts[0].p);
  var s = '';
  for (var i = 0; i < parts.length; i++) {
    var x = parts[i];
    if (typeof x === 'string') s += x;
    else { var v = lookup(scope, x.p); s += v == null ? '' : String(v); }
  }
  return s;
}

var styleCache = new Map();
function camel(k) {
  if (k.indexOf('--') === 0) return k;
  return k.replace(/^-(webkit|moz)-/, function (m, p) { return p.charAt(0).toUpperCase() + p.slice(1) + '-'; })
    .replace(/-([a-z])/g, function (m, c) { return c.toUpperCase(); });
}
function parseStyle(str) {
  var hit = styleCache.get(str);
  if (hit) return hit;
  var o = {}, depth = 0, cur = '', decls = [];
  for (var i = 0; i < str.length; i++) {
    var ch = str.charAt(i);
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { decls.push(cur); cur = ''; } else cur += ch;
  }
  decls.push(cur);
  decls.forEach(function (d) {
    var j = d.indexOf(':');
    if (j < 0) return;
    var k = d.slice(0, j).trim(), v = d.slice(j + 1).trim();
    if (k) o[camel(k)] = v;
  });
  if (styleCache.size > 4000) styleCache.clear();
  styleCache.set(str, o);
  return o;
}

function renderList(nodes, scope) {
  var out = [];
  for (var i = 0; i < nodes.length; i++) {
    var r = renderNode(nodes[i], scope);
    if (r !== null && r !== undefined) out.push(r);
  }
  return out;
}

function renderNode(n, scope) {
  if (n.k === 'text') {
    var t = evalParts(n.parts, scope);
    return t == null ? null : String(t);
  }
  if (n.k === 'if') {
    if (!evalParts(n.v, scope)) return null;
    return h.apply(null, [Fragment, null].concat(renderList(n.children, scope)));
  }
  if (n.k === 'for') {
    var list = evalParts(n.list, scope);
    if (!Array.isArray(list)) return null;
    return list.map(function (item, i) {
      var sc = Object.create(scope);
      sc[n.as] = item;
      return h.apply(null, [Fragment, { key: i }].concat(renderList(n.children, sc)));
    });
  }
  var props = {};
  for (var i = 0; i < n.attrs.length; i++) {
    var a = n.attrs[i], v = evalParts(a.parts, scope);
    if (a.name === 'style') { props.style = parseStyle(String(v == null ? '' : v)); continue; }
    if (a.name.indexOf('on') === 0 && a.name.length > 2 && a.name.charAt(2) === a.name.charAt(2).toUpperCase()) {
      if (typeof v === 'function') props[a.name] = v;
      continue;
    }
    if (BOOL_PROPS[a.name]) { props[a.name] = v === true || v === 'true' || v === '' ; continue; }
    if (a.name === 'value') { props.value = v == null ? '' : v; continue; }
    if (v === undefined || v === null) continue;
    props[a.name] = v;
  }
  if (n.tag === 'input' && props.value !== undefined && !props.onChange) props.readOnly = true;
  if (n.tag === 'input' && props.type === 'checkbox' && props.checked !== undefined && !props.onChange) props.readOnly = true;
  return h.apply(null, [n.tag, props].concat(renderList(n.children, scope)));
}

export function DCView(p) {
  var inst = p.instance;
  var _ = useReducer(function (x) { return x + 1; }, 0), force = _[1];
  useEffect(function () { return inst.subscribe(force); }, [inst]);
  useEffect(function () { return function () { if (inst.componentWillUnmount) inst.componentWillUnmount(); }; }, [inst]);
  var vals = inst.renderVals();
  return h.apply(null, [Fragment, null].concat(renderList(p.compiled, vals)));
}
