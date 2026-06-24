import { useState } from "react";
import { Search, Activity, Trash2, ArrowUpRight, ArrowDownLeft, SlidersHorizontal, RefreshCw, FileSpreadsheet, Sparkles, Check } from "lucide-react";
import { motion } from "motion/react";
import { StockLog } from "../firebase";

interface ActivityLogsTableProps {
  logs: StockLog[];
  onClearLogs: () => Promise<void>;
}

export default function ActivityLogsTable({ logs, onClearLogs }: ActivityLogsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  // Filtragem dos logs
  const filteredLogs = logs.filter((log) => {
    const matchesSearch = log.productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.operator || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (log.notes || "").toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === "all" || log.type === typeFilter;

    return matchesSearch && matchesType;
  });

  const getLogBadge = (type: string) => {
    switch (type) {
      case "count":
        return {
          label: "Auditoria/Contagem",
          bgColor: "bg-purple-950/50 text-purple-300 border-purple-900/40",
          icon: SlidersHorizontal
        };
      case "in":
        return {
          label: "Entrada",
          bgColor: "bg-emerald-950/50 text-emerald-300 border-emerald-900/40",
          icon: ArrowUpRight
        };
      case "out":
        return {
          label: "Saída",
          bgColor: "bg-amber-950/50 text-amber-300 border-amber-900/40",
          icon: ArrowDownLeft
        };
      default:
        return {
          label: "Ajuste",
          bgColor: "bg-blue-950/50 text-blue-300 border-blue-900/40",
          icon: Sparkles
        };
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    setIsExporting(true);
    
    // Simular exportação gerando de fato um download
    setTimeout(() => {
      const headers = ["Data/Hora", "Produto", "Tipo", "Qtd Ajustada", "Estoque Antigo", "Estoque Novo", "Diferenca", "Operador", "Notas"];
      const rows = filteredLogs.map(log => [
        new Date(log.timestamp).toLocaleString("pt-BR"),
        log.productName,
        log.type.toUpperCase(),
        log.quantity,
        log.previousStock,
        log.newStock,
        log.difference > 0 ? `+${log.difference}` : log.difference,
        log.operator || "Sistema",
        log.notes || ""
      ]);

      const csvContent = "\uFEFF" + [headers.join(";"), ...rows.map(e => e.map(val => `"${val}"`).join(";"))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `auditoria_estoque_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsExporting(false);
      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 3000);
    }, 1200);
  };

  return (
    <div className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-lg overflow-hidden">
      {/* Header controls */}
      <div className="p-5 border-b border-[#334155] bg-[#0F172A]/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-[#3B82F6] text-white rounded-lg">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-[#F8FAFC]">Histórico de Auditoria & Ajustes</h4>
            <p className="text-[11px] font-medium text-[#94A3B8]">Total de {filteredLogs.length} movimentações rastreadas</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              id="log-search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar histórico..."
              className="pl-9 pr-3 py-1.5 rounded-xl border border-[#334155] text-xs focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] focus:outline-hidden focus:ring-3 text-white placeholder-slate-500 bg-[#0F172A] w-full md:w-48"
            />
          </div>

          {/* Type filter */}
          <select
            id="log-type-filter"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-1.5 rounded-xl border border-[#334155] text-xs focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] focus:outline-hidden focus:ring-3 bg-[#0F172A] text-white"
          >
            <option value="all" className="bg-[#1E293B]">Todos os tipos</option>
            <option value="count" className="bg-[#1E293B]">Contagens / Auditorias</option>
            <option value="adjustment" className="bg-[#1E293B]">Ajustes Manuais</option>
            <option value="in" className="bg-[#1E293B]">Entradas</option>
            <option value="out" className="bg-[#1E293B]">Saídas</option>
          </select>

          {/* Export to CSV */}
          <button
            id="log-export-csv-btn"
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0 || isExporting}
            className="px-3 py-1.5 rounded-xl bg-[#334155] hover:bg-[#475569] disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-[#334155]"
          >
            {isExporting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-400" />
            ) : exportSuccess ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            )}
            {exportSuccess ? "Exportado!" : "Exportar CSV"}
          </button>

          {/* Clear Logs */}
          {logs.length > 0 && (
            <button
              id="log-clear-btn"
              onClick={() => {
                if (window.confirm("Deseja realmente limpar permanentemente todo o histórico de auditoria do banco de dados?")) {
                  onClearLogs();
                }
              }}
              className="p-1.5 rounded-xl text-rose-400 hover:bg-rose-950/40 hover:text-rose-300 transition-colors cursor-pointer border border-transparent hover:border-rose-900/50"
              title="Limpar Histórico"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Logs timeline/table */}
      {filteredLogs.length === 0 ? (
        <div className="p-10 text-center flex flex-col items-center justify-center">
          <Activity className="w-8 h-8 text-slate-500 animate-pulse-slow mb-3" />
          <p className="text-xs font-semibold text-[#94A3B8]">Nenhum log encontrado</p>
          <p className="text-[10px] text-slate-500 mt-1">Experimente alterar os filtros de pesquisa ou realizar novos lançamentos de contagem.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0F172A]/50 text-[#94A3B8] font-bold uppercase tracking-wider border-b border-[#334155]">
                <th className="px-5 py-3 font-semibold">Data & Hora</th>
                <th className="px-5 py-3 font-semibold">Produto</th>
                <th className="px-5 py-3 font-semibold">Tipo de Movimento</th>
                <th className="px-5 py-3 font-semibold text-center">Quantidades (De → Para)</th>
                <th className="px-5 py-3 font-semibold text-center">Diferença</th>
                <th className="px-5 py-3 font-semibold">Operador</th>
                <th className="px-5 py-3 font-semibold">Notas / Justificativa</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#334155] font-medium text-[#94A3B8]">
              {filteredLogs.map((log) => {
                const badge = getLogBadge(log.type);
                const LogIcon = badge.icon;
                const isPositive = log.difference > 0;
                const isNeutral = log.difference === 0;

                return (
                  <motion.tr
                    key={log.id}
                    id={`log-row-${log.id}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-[#334155]/20 transition-colors"
                  >
                    {/* Timestamp */}
                    <td className="px-5 py-3.5 font-mono text-[10px] text-slate-500 whitespace-nowrap">
                      {new Date(log.timestamp).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit"
                      })}
                    </td>

                    {/* Product Name */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <div className="font-bold text-[#F8FAFC]">{log.productName}</div>
                      <div className="text-[9px] text-slate-500 font-mono">ID: {log.productId.split("-")[1] || log.productId}</div>
                    </td>

                    {/* Type Badge */}
                    <td className="px-5 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${badge.bgColor}`}>
                        <LogIcon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    </td>

                    {/* Quantity Transition */}
                    <td className="px-5 py-3.5 text-center font-mono text-[11px] whitespace-nowrap">
                      <span className="text-slate-400">{log.previousStock}</span>
                      <span className="mx-2 text-slate-600">→</span>
                      <span className="text-[#F8FAFC] font-bold">{log.newStock}</span>
                    </td>

                    {/* Difference */}
                    <td className="px-5 py-3.5 text-center whitespace-nowrap">
                      {isNeutral ? (
                        <span className="px-2 py-0.5 rounded-sm bg-slate-800 text-slate-400 font-bold font-mono text-[10px] border border-slate-700">
                          0
                        </span>
                      ) : isPositive ? (
                        <span className="px-2 py-0.5 rounded-sm bg-emerald-950/50 text-emerald-400 font-bold font-mono text-[10px] border border-emerald-900/50">
                          +{log.difference}
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-sm bg-rose-950/50 text-rose-400 font-bold font-mono text-[10px] border border-rose-900/50">
                          {log.difference}
                        </span>
                      )}
                    </td>

                    {/* Operator */}
                    <td className="px-5 py-3.5 text-slate-300 whitespace-nowrap">
                      {log.operator || "Sistema"}
                    </td>

                    {/* Notes */}
                    <td className="px-5 py-3.5 text-[#94A3B8] max-w-xs truncate" title={log.notes}>
                      {log.notes || "-"}
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
