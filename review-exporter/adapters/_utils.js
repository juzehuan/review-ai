// Shared utilities for adapters: MD5 (for MTOP signing) + cookie helpers.
// Loaded before any specific adapter.

(() => {
  const registry = window.__REVIEW_EXPORTER;
  if (!registry || registry._utils) {
    return;
  }

  // MD5 implementation (public-domain compact variant).
  function md5(input) {
    function L(k, d) { return (k << d) | (k >>> (32 - d)); }
    function K(G, k) {
      const F = G & 0x80000000, H = k & 0x80000000;
      const I = G & 0x40000000, d = k & 0x40000000;
      const x = (G & 0x3FFFFFFF) + (k & 0x3FFFFFFF);
      if (I & d) return x ^ 0x80000000 ^ F ^ H;
      if (I | d) {
        if (x & 0x40000000) return x ^ 0xC0000000 ^ F ^ H;
        return x ^ 0x40000000 ^ F ^ H;
      }
      return x ^ F ^ H;
    }
    function r(d, F, k) { return (d & F) | (~d & k); }
    function q(d, F, k) { return (d & k) | (F & ~k); }
    function p(d, F, k) { return d ^ F ^ k; }
    function n(d, F, k) { return F ^ (d | ~k); }
    function u(G, F, aa, Z, k, H, I) { G = K(G, K(K(r(F, aa, Z), k), I)); return K(L(G, H), F); }
    function f(G, F, aa, Z, k, H, I) { G = K(G, K(K(q(F, aa, Z), k), I)); return K(L(G, H), F); }
    function D(G, F, aa, Z, k, H, I) { G = K(G, K(K(p(F, aa, Z), k), I)); return K(L(G, H), F); }
    function t(G, F, aa, Z, k, H, I) { G = K(G, K(K(n(F, aa, Z), k), I)); return K(L(G, H), F); }
    function e(G) {
      const F = G.length;
      const x = F + 8;
      const k = (x - (x % 64)) / 64;
      const I = (k + 1) * 16;
      const aa = new Array(I - 1).fill(0);
      let H = 0;
      while (H < F) {
        const Z = (H - (H % 4)) / 4;
        const d = (H % 4) * 8;
        aa[Z] = aa[Z] | (G.charCodeAt(H) << d);
        H++;
      }
      const Z = (H - (H % 4)) / 4;
      const d = (H % 4) * 8;
      aa[Z] = aa[Z] | (0x80 << d);
      aa[I - 2] = F << 3;
      aa[I - 1] = F >>> 29;
      return aa;
    }
    function B(x) {
      let k = "";
      for (let d = 0; d <= 3; d++) {
        const G = (x >>> (d * 8)) & 0xFF;
        const F = "0" + G.toString(16);
        k = k + F.substr(F.length - 2, 2);
      }
      return k;
    }
    function J(k) {
      k = k.replace(/\r\n/g, "\n");
      let d = "";
      for (let F = 0; F < k.length; F++) {
        const x = k.charCodeAt(F);
        if (x < 128) d += String.fromCharCode(x);
        else if (x > 127 && x < 2048) {
          d += String.fromCharCode((x >> 6) | 192);
          d += String.fromCharCode((x & 63) | 128);
        } else {
          d += String.fromCharCode((x >> 12) | 224);
          d += String.fromCharCode(((x >> 6) & 63) | 128);
          d += String.fromCharCode((x & 63) | 128);
        }
      }
      return d;
    }
    const S = 7, Q = 12, N = 17, O = 22;
    const A = 5, z = 9, y = 14, w = 20;
    const o = 4, m = 11, l = 16, j = 23;
    const U = 6, T = 10, R = 15, V = 21;
    const s = J(input);
    const C = e(s);
    let Y = 0x67452301, M = 0xEFCDAB89, X = 0x98BADCFE, W = 0x10325476;
    for (let P = 0; P < C.length; P += 16) {
      const h = Y, E = M, v = X, g = W;
      Y = u(Y, M, X, W, C[P + 0], S, 0xD76AA478);
      W = u(W, Y, M, X, C[P + 1], Q, 0xE8C7B756);
      X = u(X, W, Y, M, C[P + 2], N, 0x242070DB);
      M = u(M, X, W, Y, C[P + 3], O, 0xC1BDCEEE);
      Y = u(Y, M, X, W, C[P + 4], S, 0xF57C0FAF);
      W = u(W, Y, M, X, C[P + 5], Q, 0x4787C62A);
      X = u(X, W, Y, M, C[P + 6], N, 0xA8304613);
      M = u(M, X, W, Y, C[P + 7], O, 0xFD469501);
      Y = u(Y, M, X, W, C[P + 8], S, 0x698098D8);
      W = u(W, Y, M, X, C[P + 9], Q, 0x8B44F7AF);
      X = u(X, W, Y, M, C[P + 10], N, 0xFFFF5BB1);
      M = u(M, X, W, Y, C[P + 11], O, 0x895CD7BE);
      Y = u(Y, M, X, W, C[P + 12], S, 0x6B901122);
      W = u(W, Y, M, X, C[P + 13], Q, 0xFD987193);
      X = u(X, W, Y, M, C[P + 14], N, 0xA679438E);
      M = u(M, X, W, Y, C[P + 15], O, 0x49B40821);
      Y = f(Y, M, X, W, C[P + 1], A, 0xF61E2562);
      W = f(W, Y, M, X, C[P + 6], z, 0xC040B340);
      X = f(X, W, Y, M, C[P + 11], y, 0x265E5A51);
      M = f(M, X, W, Y, C[P + 0], w, 0xE9B6C7AA);
      Y = f(Y, M, X, W, C[P + 5], A, 0xD62F105D);
      W = f(W, Y, M, X, C[P + 10], z, 0x02441453);
      X = f(X, W, Y, M, C[P + 15], y, 0xD8A1E681);
      M = f(M, X, W, Y, C[P + 4], w, 0xE7D3FBC8);
      Y = f(Y, M, X, W, C[P + 9], A, 0x21E1CDE6);
      W = f(W, Y, M, X, C[P + 14], z, 0xC33707D6);
      X = f(X, W, Y, M, C[P + 3], y, 0xF4D50D87);
      M = f(M, X, W, Y, C[P + 8], w, 0x455A14ED);
      Y = f(Y, M, X, W, C[P + 13], A, 0xA9E3E905);
      W = f(W, Y, M, X, C[P + 2], z, 0xFCEFA3F8);
      X = f(X, W, Y, M, C[P + 7], y, 0x676F02D9);
      M = f(M, X, W, Y, C[P + 12], w, 0x8D2A4C8A);
      Y = D(Y, M, X, W, C[P + 5], o, 0xFFFA3942);
      W = D(W, Y, M, X, C[P + 8], m, 0x8771F681);
      X = D(X, W, Y, M, C[P + 11], l, 0x6D9D6122);
      M = D(M, X, W, Y, C[P + 14], j, 0xFDE5380C);
      Y = D(Y, M, X, W, C[P + 1], o, 0xA4BEEA44);
      W = D(W, Y, M, X, C[P + 4], m, 0x4BDECFA9);
      X = D(X, W, Y, M, C[P + 7], l, 0xF6BB4B60);
      M = D(M, X, W, Y, C[P + 10], j, 0xBEBFBC70);
      Y = D(Y, M, X, W, C[P + 13], o, 0x289B7EC6);
      W = D(W, Y, M, X, C[P + 0], m, 0xEAA127FA);
      X = D(X, W, Y, M, C[P + 3], l, 0xD4EF3085);
      M = D(M, X, W, Y, C[P + 6], j, 0x04881D05);
      Y = D(Y, M, X, W, C[P + 9], o, 0xD9D4D039);
      W = D(W, Y, M, X, C[P + 12], m, 0xE6DB99E5);
      X = D(X, W, Y, M, C[P + 15], l, 0x1FA27CF8);
      M = D(M, X, W, Y, C[P + 2], j, 0xC4AC5665);
      Y = t(Y, M, X, W, C[P + 0], U, 0xF4292244);
      W = t(W, Y, M, X, C[P + 7], T, 0x432AFF97);
      X = t(X, W, Y, M, C[P + 14], R, 0xAB9423A7);
      M = t(M, X, W, Y, C[P + 5], V, 0xFC93A039);
      Y = t(Y, M, X, W, C[P + 12], U, 0x655B59C3);
      W = t(W, Y, M, X, C[P + 3], T, 0x8F0CCC92);
      X = t(X, W, Y, M, C[P + 10], R, 0xFFEFF47D);
      M = t(M, X, W, Y, C[P + 1], V, 0x85845DD1);
      Y = t(Y, M, X, W, C[P + 8], U, 0x6FA87E4F);
      W = t(W, Y, M, X, C[P + 15], T, 0xFE2CE6E0);
      X = t(X, W, Y, M, C[P + 6], R, 0xA3014314);
      M = t(M, X, W, Y, C[P + 13], V, 0x4E0811A1);
      Y = t(Y, M, X, W, C[P + 4], U, 0xF7537E82);
      W = t(W, Y, M, X, C[P + 11], T, 0xBD3AF235);
      X = t(X, W, Y, M, C[P + 2], R, 0x2AD7D2BB);
      M = t(M, X, W, Y, C[P + 9], V, 0xEB86D391);
      Y = K(Y, h); M = K(M, E); X = K(X, v); W = K(W, g);
    }
    return (B(Y) + B(M) + B(X) + B(W)).toLowerCase();
  }

  function getCookie(name) {
    const all = document.cookie || "";
    const parts = all.split(";").map((s) => s.trim());
    for (const p of parts) {
      const idx = p.indexOf("=");
      if (idx === -1) continue;
      const k = p.slice(0, idx);
      if (k === name) return decodeURIComponent(p.slice(idx + 1));
    }
    return null;
  }

  registry._utils = { md5, getCookie };
})();
