import { useState, useEffect, FormEvent } from "react";
import { ClipboardList, ArrowRight, RefreshCw, AlertTriangle, CheckCircle2, User, HelpCircle, Sparkles } from "lucide-react";
import { motion } from "motion/react";
import { Product } from "../firebase";

interface InventoryCountSessionProps {
  products: Product[];
  onConfirmCount: (
    productId: string,
    countedQty: number,
    notes: string,
    operator: string
  ) => Promise<void>;
}

export default function InventoryCountSession({
  products,
  onConfirmCount,
}: InventoryCountSessionProps) {
  const [selectedProductId, setSelectedProductId] = useState("");
  const [countedQtyString, setCountedQtyString] = useState("");
  const [operator, setOperator] = useState("Auditor de Estoque");
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Procurar o produto selecionado
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Auto-ajustar notas pré-definidas baseado na diferença
  const getSuggestedNote = (diff: number) => {
    if (diff === 0) return "Contagem realizada de rotina. Estoque 100% correto.";
    if (diff < 0) return `Inventário Mensal: Perda identificada (${Math.abs(diff)} un).`;
    return `Inventário Mensal: Sobra identificada (+${diff} un).`;
  };

  const registeredQty = selectedProduct ? selectedProduct.currentStock : 0;
  const countedQty = countedQtyString !== "" ? parseInt(countedQtyString) || 0 : 0;
  const difference = countedQty - registeredQty;

  // Atualizar nota sugerida quando a diferença muda
  useEffect(() => {
    if (selectedProduct && countedQtyString !== "") {
      setNotes(getSuggestedNote(difference));
    } else {
      setNotes("");
    }
  }, [selectedProductId, countedQtyString]);

  const handleAuditSubmit = async (e: FormEvent) => {

    e.preventDefault();
    if (!selectedProductId) return;
    if (countedQtyString === "") return;

    setIsLoading(true);
    try {
      await onConfirmCount(
        selectedProductId,
        countedQty,
        notes || "Contagem manual realizada.",
        operator || "Auditor"
      );
      setSuccessMessage(`Estoque do produto "${selectedProduct?.name}" atualizado de ${registeredQty} para ${countedQty} com sucesso!`);
      
      // Resetar formulário
      setSelectedProductId("");
      setCountedQtyString("");
      setNotes("");
      
      // Limpar mensagem após 5s
      setTimeout(() => setSuccessMessage(""), 6000);
    } catch (err) {
      console.error("Erro ao processar auditoria:", err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-lg p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 pb-5 mb-5 border-b border-[#334155]">
        <div className="p-2.5 rounded-xl bg-[#3B82F6] text-white">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold font-display text-[#F8FAFC]">
            Sessão de Auditoria & Contagem Física
          </h3>
          <p className="text-xs text-[#94A3B8] font-medium">
            Selecione o produto físico, digite a quantidade real contada na prateleira e registre divergências.
          </p>
        </div>
      </div>

      {/* Success Notification */}
      {successMessage && (
        <motion.div
          id="audit-success-banner"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-900/50 text-emerald-300 text-xs font-semibold flex items-start gap-2.5 mb-5"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div>{successMessage}</div>
        </motion.div>
      )}

      {/* Audit Form */}
      <form onSubmit={handleAuditSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Product Selector */}
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
              1. Selecionar Produto do Estoque
            </label>
            <select
              id="audit-select-product"
              value={selectedProductId}
              onChange={(e) => {
                setSelectedProductId(e.target.value);
                setCountedQtyString("");
              }}
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-all text-white bg-[#0F172A]"
            >
              <option value="" className="bg-[#1E293B]">-- Escolha um produto para auditar --</option>
              {products
                .sort((a, b) => a.name.localeCompare(b.name))
                .map((p) => (
                  <option key={p.id} value={p.id} className="bg-[#1E293B]">
                    {p.name} (SKU: {p.sku} | Estoque: {p.currentStock} {p.unit})
                  </option>
                ))}
            </select>
          </div>

          {/* Operator Name */}
          <div>
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-[#94A3B8]" /> 2. Operador / Auditor
            </label>
            <input
              id="audit-operator-input"
              type="text"
              value={operator}
              onChange={(e) => setOperator(e.target.value)}
              placeholder="Nome de quem está contando"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-all text-white bg-[#0F172A]"
            />
          </div>
        </div>

        {selectedProduct && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="p-5 rounded-xl bg-[#0F172A] border border-[#334155] grid grid-cols-1 md:grid-cols-3 gap-4 items-center overflow-hidden"
          >
            {/* Registered Stock Display */}
            <div className="text-center p-3 bg-[#1E293B] rounded-xl border border-[#334155]">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1">
                Registrado no Sistema
              </span>
              <span className="text-xl font-bold font-mono text-[#F8FAFC]">
                {registeredQty} <span className="text-xs font-sans text-slate-400">{selectedProduct.unit}</span>
              </span>
            </div>

            {/* Input counted stock */}
            <div className="text-center">
              <span className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider block mb-1.5">
                Quantidade Física Real Contada
              </span>
              <div className="relative inline-block w-full max-w-[150px]">
                <input
                  id="audit-count-qty-input"
                  type="number"
                  min="0"
                  value={countedQtyString}
                  onChange={(e) => setCountedQtyString(e.target.value)}
                  placeholder="Digitado..."
                  className="w-full px-3 py-2 rounded-xl border border-[#334155] focus:border-[#3B82F6] text-center font-bold font-mono text-lg text-white focus:outline-hidden focus:ring-3 focus:ring-[#3B82F6]/20 transition-all bg-[#1E293B]"
                />
              </div>
            </div>

            {/* Live calculated difference indicator */}
            <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-[#1E293B] border border-[#334155] min-h-[72px]">
              {countedQtyString === "" ? (
                <div className="text-center text-xs text-slate-500 font-medium flex items-center gap-1">
                  <HelpCircle className="w-3.5 h-3.5" /> Aguardando digitação...
                </div>
              ) : difference === 0 ? (
                <div className="text-center">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-1">
                    Divergência
                  </span>
                  <div className="flex items-center justify-center gap-1.5 text-emerald-400 font-bold text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Sem divergências (0)
                  </div>
                </div>
              ) : difference < 0 ? (
                <div className="text-center">
                  <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider block mb-0.5">
                    Falta (Perda / Quebra)
                  </span>
                  <div className="flex items-center justify-center gap-1 text-rose-400 font-bold text-sm">
                    <AlertTriangle className="w-4 h-4" /> {difference} {selectedProduct.unit}
                  </div>
                  <span className="text-[9px] font-semibold text-rose-500 block mt-0.5">
                    O estoque será reduzido
                  </span>
                </div>
              ) : (
                <div className="text-center">
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider block mb-0.5">
                    Sobra (Ganho / Ajuste)
                  </span>
                  <div className="flex items-center justify-center gap-1 text-blue-400 font-bold text-sm">
                    <Sparkles className="w-4 h-4" /> +{difference} {selectedProduct.unit}
                  </div>
                  <span className="text-[9px] font-semibold text-blue-500 block mt-0.5">
                    O estoque será aumentado
                  </span>
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Notes and reasons */}
        {selectedProduct && countedQtyString !== "" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide">
              3. Justificativa / Notas do Log de Contagem
            </label>
            <input
              id="audit-notes-input"
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Auditoria mensal rotineira, quebra de caixa, ajuste de prateleira"
              className="w-full px-3.5 py-2.5 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-all text-white bg-[#0F172A] placeholder-slate-500"
            />
            <div className="flex flex-wrap gap-1.5 mt-1">
              <button
                type="button"
                onClick={() => setNotes(getSuggestedNote(difference))}
                className="text-[10px] font-bold text-[#94A3B8] hover:text-white bg-[#334155] hover:bg-[#475569] px-2.5 py-1 rounded transition-colors border border-[#334155]"
              >
                Resetar para sugestão automática
              </button>
              <button
                type="button"
                onClick={() => setNotes("Ajuste físico de prateleira devido a avaria.")}
                className="text-[10px] font-bold text-[#94A3B8] hover:text-white bg-[#334155] hover:bg-[#475569] px-2.5 py-1 rounded transition-colors border border-[#334155]"
              >
                Avaria
              </button>
              <button
                type="button"
                onClick={() => setNotes("Correção de entrada dupla anterior.")}
                className="text-[10px] font-bold text-[#94A3B8] hover:text-white bg-[#334155] hover:bg-[#475569] px-2.5 py-1 rounded transition-colors border border-[#334155]"
              >
                Correção de Entrada
              </button>
            </div>
          </motion.div>
        )}

        {/* Submit button */}
        <div className="pt-2 border-t border-[#334155] flex items-center justify-end">
          <button
            id="audit-submit-btn"
            type="submit"
            disabled={!selectedProductId || countedQtyString === "" || isLoading}
            className="w-full md:w-auto px-6 py-3 rounded-xl bg-[#3B82F6] hover:bg-blue-600 disabled:bg-[#1E293B] disabled:text-slate-500 disabled:border-[#334155] border border-transparent text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Processando Contagem...
              </>
            ) : (
              <>
                Confirmar Contagem de Estoque
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
