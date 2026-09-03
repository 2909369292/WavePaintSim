export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

// BUG-016：原实现 `${prefix}_${Math.random().toString(36).slice(2, 8)}` 有两个坑：
//   1) Math.random() 很小时（如 1e-8）toString(36) 只有几位，slice(2,8) 会拿到
//      更短甚至空串，id 直接退化成 "sig_"；
//   2) 只取 6 个 base36 字符（约 31 bit），批量创建信号/文件时碰撞概率不可忽略，
//      id 撞车会让「选中/删除/重命名」作用到错误的对象上。
// 现在改为「时间 + 进程内自增 + 随机」三段拼接，碰撞实际上不可能发生。
let uidCounter = 0;
export function uid(prefix = "id") {
  uidCounter += 1;
  const rand = Math.random().toString(36).slice(2, 8).padEnd(6, "0");
  return prefix + "_" + Date.now().toString(36) + "_" + uidCounter.toString(36) + "_" + rand;
}

export function deepClone(value) {
  return JSON.parse(JSON.stringify(value));
}

export function saveJsonFile(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  // 部分浏览器要求锚点真的在文档里才会触发下载
  document.body.appendChild(anchor);
  anchor.click();
  // BUG-017：原来 click() 后立刻 revokeObjectURL —— 下载线程可能还没开始读 blob，
  // URL 就失效了，表现为「点了导出却什么都没下下来」（偶发，难复现）。
  // 延后释放；10s 足够启动下载，且不会长期占用。
  setTimeout(function () {
    if (anchor.parentElement) anchor.parentElement.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, 10000);
}
