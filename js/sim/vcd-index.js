// js/sim/vcd-index.js —— VCD 全路径层次索引（#75 P0）
// ----------------------------------------------------------------
// 输入：engine.parseVcd() 的产物 parsed = { tmax, signals:[{width,id,name,reference,scope,steps}] }
//       scope 为点分层次路径（如 "tb.dut"），根信号 scope 为空串。
// 输出：{ signalCount, scopeCount, tree }，tree 为纯数据树（无 Map/循环引用，
//       可直接 JSON 序列化 / 渲染），每个 scope 节点：
//         { path, name, signals:[{name, reference, width}], scopes:[子节点] }
// 用途：P1「点变量 → 加波形」与 P2 Active Annotation 的层次导航底座。
// 纯函数、无 DOM 依赖，可在 regression.mjs 中直接单测。

export function buildVcdHierarchy(parsed) {
  const root = { path: "", name: "", signals: [], scopes: [] };
  const byPath = new Map([["", root]]);
  const rawSignals = Array.isArray(parsed?.signals) ? parsed.signals : [];

  for (const signal of rawSignals) {
    const scope = String(signal?.scope || "");
    let node = byPath.get(scope);
    if (!node) {
      // 沿点分路径逐级建链（tb.dut → tb → dut）
      const parts = scope ? scope.split(".") : [];
      let current = root;
      let currentPath = "";
      for (const part of parts) {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        let child = byPath.get(currentPath);
        if (!child) {
          child = { path: currentPath, name: part, signals: [], scopes: [] };
          byPath.set(currentPath, child);
          current.scopes.push(child);
        }
        current = child;
      }
      node = current;
    }
    node.signals.push({
      name: signal?.name || signal?.reference || "",
      reference: signal?.reference || "",
      width: Math.max(1, Number(signal?.width) || 1)
    });
  }

  return {
    signalCount: rawSignals.length,
    scopeCount: byPath.size - 1,
    tree: root
  };
}
