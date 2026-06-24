import { useState, useEffect, FormEvent } from "react";
import { X, ArrowUpRight, ArrowDownLeft, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../firebase";

interface QuickAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onAdjust: (productId: string, type: "in" | "out", quantity: number, notes: string) => Promise<void>;
}

export default function QuickAdjustModal({
  isOpen,
  onClose,
  product,
  onAdjust,
}: QuickAdjustModalProps) {
  const [qtyString, setQtyString] = useState("");
  const [type, setType] = useState<"in" | "out">("in");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setQtyString("");
    setType("in");
    setNotes("");
    setIsSubmitting(false);
  }, [product, isOpen]);

  if (!product) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const qty = parseInt(qtyString);
    if (!qty || qty <= 0) return;

    setIsSubmitting(true);
    try {
      const finalNotes = notes.trim() || (type === "in" ? "Entrada manual de estoque" : "Saída manual de estoque");
      await onAdjust(product.id, type, qty, finalNotes);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs"
          />

          {/* Modal Card */}
          <motion.div
            id="quick-adjust-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-2xl w-full max-w-md relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="px-5 py-4 border-b border-[#334155] flex items-center justify-between bg-[#0F172A]/50">
              <div>
                <h4 className="text-sm font-bold font-display text-[#F8FAFC]">
                  Ajuste Rápido de Estoque
                </h4>
                <p className="text-[11px] font-medium text-[#94A3B8]">
                  {product.name}
                </p>
              </div>
              <button
                id="close-quick-adjust"
                onClick={onClose}
                className="p-1 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              {/* Product mini info card */}
              <div className="p-3 rounded-xl bg-[#0F172A] border border-[#334155] text-xs flex justify-between items-center font-medium">
                <span className="text-[#94A3B8]">Saldo Atual:</span>
                <span className="text-[#F8FAFC] font-bold font-mono">
                  {product.currentStock} {product.unit}
                </span>
              </div>

              {/* Toggle Entry / Exit */}
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
                  Tipo de Movimentação
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setType("in")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      type === "in"
                        ? "bg-emerald-950/60 border-emerald-900/50 text-emerald-400 font-bold"
                        : "bg-[#0F172A] border-[#334155] text-slate-400 hover:bg-[#334155]/30 hover:text-[#F8FAFC]"
                    }`}
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    Entrada (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("out")}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      type === "out"
                        ? "bg-amber-950/60 border-amber-900/50 text-amber-400 font-bold"
                        : "bg-[#0F172A] border-[#334155] text-slate-400 hover:bg-[#334155]/30 hover:text-[#F8FAFC]"
                    }`}
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    Saída (-)
                  </button>
                </div>
              </div>

              {/* Quantity Input */}
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Quantidade a {type === "in" ? "Adicionar" : "Retirar"} <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <input
                    id="quick-adjust-qty-input"
                    type="number"
                    min="1"
                    required
                    value={qtyString}
                    onChange={(e) => setQtyString(e.target.value)}
                    placeholder="Digite a quantidade..."
                    className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] focus:outline-hidden focus:ring-3 transition-all text-sm text-white bg-[#0F172A] font-mono font-bold placeholder-slate-500"
                  />
                  <span className="absolute right-3.5 top-2.5 text-xs text-slate-400 font-semibold uppercase">
                    {product.unit}
                  </span>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-[11px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">
                  Observações / Motivo
                </label>
                <input
                  id="quick-adjust-notes-input"
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={type === "in" ? "Ex: Compra de fornecedor, devolução" : "Ex: Venda realizada, descarte"}
                  className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] focus:outline-hidden focus:ring-3 transition-all text-sm text-white bg-[#0F172A] placeholder-slate-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-[#334155] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#334155] text-xs font-semibold text-slate-300 hover:text-white bg-[#334155] hover:bg-[#475569] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!qtyString || parseInt(qtyString) <= 0 || isSubmitting}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 shadow-sm cursor-pointer transition-all ${
                    type === "in"
                      ? "bg-emerald-600 hover:bg-emerald-500 disabled:bg-[#1E293B] disabled:text-slate-500 disabled:border-[#334155]"
                      : "bg-amber-600 hover:bg-amber-500 disabled:bg-[#1E293B] disabled:text-slate-500 disabled:border-[#334155]"
                  }`}
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    "Confirmar Lançamento"
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
