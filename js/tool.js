/* 공통 이미지 처리 유틸 — 모든 처리는 브라우저 안에서만 이루어집니다 */
(function (global) {
  "use strict";

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(2) + " MB";
  }

  function setupDropzone(zoneEl, inputEl, onFiles) {
    zoneEl.addEventListener("click", function () { inputEl.click(); });
    zoneEl.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") { e.preventDefault(); inputEl.click(); }
    });
    inputEl.addEventListener("change", function () {
      if (inputEl.files && inputEl.files.length) onFiles(Array.from(inputEl.files));
      inputEl.value = "";
    });
    ["dragover", "dragenter"].forEach(function (ev) {
      zoneEl.addEventListener(ev, function (e) {
        e.preventDefault();
        zoneEl.classList.add("dragover");
      });
    });
    ["dragleave", "drop"].forEach(function (ev) {
      zoneEl.addEventListener(ev, function (e) {
        e.preventDefault();
        zoneEl.classList.remove("dragover");
      });
    });
    zoneEl.addEventListener("drop", function (e) {
      var files = Array.from(e.dataTransfer.files || []);
      if (files.length) onFiles(files);
    });
  }

  function isHeic(file) {
    var name = (file.name || "").toLowerCase();
    return file.type === "image/heic" || file.type === "image/heif" ||
      name.endsWith(".heic") || name.endsWith(".heif");
  }

  var heicLoading = null;
  function ensureHeicLib() {
    if (global.heic2any) return Promise.resolve();
    if (heicLoading) return heicLoading;
    heicLoading = new Promise(function (resolve, reject) {
      var s = document.createElement("script");
      s.src = "https://cdn.jsdelivr.net/npm/heic2any@0.0.4/dist/heic2any.min.js";
      s.onload = resolve;
      s.onerror = function () { reject(new Error("HEIC 변환 모듈을 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.")); };
      document.head.appendChild(s);
    });
    return heicLoading;
  }

  /* HEIC이면 PNG Blob으로 먼저 풀어준 뒤 반환, 아니면 원본 그대로 */
  function normalizeFile(file) {
    if (!isHeic(file)) return Promise.resolve(file);
    return ensureHeicLib().then(function () {
      return global.heic2any({ blob: file, toType: "image/png" });
    }).then(function (out) {
      var blob = Array.isArray(out) ? out[0] : out;
      blob.name = file.name;
      return blob;
    });
  }

  function fileToImage(file) {
    return new Promise(function (resolve, reject) {
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { resolve({ img: img, url: url }); };
      img.onerror = function () {
        URL.revokeObjectURL(url);
        reject(new Error("이미지를 읽을 수 없습니다. 지원하는 형식인지 확인해 주세요."));
      };
      img.src = url;
    });
  }

  function drawToCanvas(img, width, height, mime) {
    var canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(width));
    canvas.height = Math.max(1, Math.round(height));
    var ctx = canvas.getContext("2d");
    if (mime === "image/jpeg") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(function (resolve, reject) {
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error("이미지 변환에 실패했습니다."));
      }, mime, quality);
    });
  }

  /* 품질 이분 탐색 + 필요시 단계적 축소로 목표 용량 이하 Blob 생성 */
  function compressToTarget(img, mime, targetBytes) {
    var scale = 1;
    function attempt() {
      var canvas = drawToCanvas(img, img.naturalWidth * scale, img.naturalHeight * scale, mime);
      var lo = 0.05, hi = 0.95, best = null;
      var step = 0;
      function search() {
        if (step >= 7) return Promise.resolve(best);
        step += 1;
        var q = (lo + hi) / 2;
        return canvasToBlob(canvas, mime, q).then(function (blob) {
          if (blob.size <= targetBytes) {
            best = blob;
            lo = q;
          } else {
            hi = q;
          }
          return search();
        });
      }
      return search().then(function (blob) {
        if (blob) return blob;
        if (scale > 0.2) {
          scale *= 0.7;
          return attempt();
        }
        return canvasToBlob(canvas, mime, 0.05);
      });
    }
    return attempt();
  }

  function changeExt(name, mime) {
    var map = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
    var base = name.replace(/\.[^/.]+$/, "");
    return base + "." + (map[mime] || "img");
  }

  function makeResultRow(container, blob, fileName, originalSize, note) {
    var row = document.createElement("div");
    row.className = "result-row";
    var url = URL.createObjectURL(blob);

    var thumb = document.createElement("img");
    thumb.className = "thumb";
    thumb.alt = fileName + " 미리보기";
    thumb.src = url;

    var info = document.createElement("div");
    info.className = "result-info";
    var fname = document.createElement("div");
    fname.className = "fname";
    fname.textContent = fileName;
    var sizes = document.createElement("div");
    sizes.className = "sizes";
    if (originalSize != null) {
      var savedPct = Math.max(0, Math.round((1 - blob.size / originalSize) * 100));
      sizes.innerHTML = formatBytes(originalSize) + " &rarr; <strong>" + formatBytes(blob.size) +
        "</strong> <span class=\"saved\">(" + savedPct + "% 절감)</span>";
    } else {
      sizes.innerHTML = "<strong>" + formatBytes(blob.size) + "</strong>" + (note ? " · " + note : "");
    }
    info.appendChild(fname);
    info.appendChild(sizes);

    var dl = document.createElement("a");
    dl.className = "dl-btn";
    dl.href = url;
    dl.download = fileName;
    dl.textContent = "다운로드";

    row.appendChild(thumb);
    row.appendChild(info);
    row.appendChild(dl);
    container.appendChild(row);
  }

  global.ImgTool = {
    formatBytes: formatBytes,
    setupDropzone: setupDropzone,
    isHeic: isHeic,
    normalizeFile: normalizeFile,
    fileToImage: fileToImage,
    drawToCanvas: drawToCanvas,
    canvasToBlob: canvasToBlob,
    compressToTarget: compressToTarget,
    changeExt: changeExt,
    makeResultRow: makeResultRow
  };
})(window);
