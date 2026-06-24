import { useState, useEffect, FormEvent } from "react";
import { X, Save, Barcode as BarcodeIcon, Info } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Product } from "../firebase";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (product: Product) => void;
  productToEdit: Product | null;
}

const CATEGORIES = ["Alimentos", "Mercearia", "Laticínios", "Bebidas", "Limpeza", "Higiene", "Hortifruti", "Outros"];
const UNITS = ["un", "kg", "g", "L", "ml", "m", "fardo", "caixa"];

export default function ProductFormModal({
  isOpen,
  onClose,
  onSubmit,
  productToEdit,
}: ProductFormModalProps) {
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [barcode, setBarcode] = useState("");
  const [category, setCategory] = useState("Alimentos");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCategory, setShowCustomCategory] = useState(false);
  const [unit, setUnit] = useState("un");
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minStock, setMinStock] = useState<number>(5);
  const [price, setPrice] = useState<number>(0);

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  // Popular formulário ao editar
  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setSku(productToEdit.sku);
      setBarcode(productToEdit.barcode || "");
      if (CATEGORIES.includes(productToEdit.category)) {
        setCategory(productToEdit.category);
        setShowCustomCategory(false);
      } else {
        setCategory("Outros");
        setCustomCategory(productToEdit.category);
        setShowCustomCategory(true);
      }
      setUnit(productToEdit.unit);
      setCurrentStock(productToEdit.currentStock);
      setMinStock(productToEdit.minStock);
      setPrice(productToEdit.price);
    } else {
      // Resetar para novo produto
      setName("");
      setSku("");
      setBarcode("");
      setCategory("Alimentos");
      setCustomCategory("");
      setShowCustomCategory(false);
      setUnit("un");
      setCurrentStock(0);
      setMinStock(5);
      setPrice(0);
    }
    setErrors({});
  }, [productToEdit, isOpen]);

  // Gerador automático de SKU quando o nome muda
  const handleNameChange = (val: string) => {
    setName(val);
    if (!productToEdit && !sku) {
      // Gerar um SKU simples com as primeiras letras do nome e um número aleatório
      const normalized = val
        .toUpperCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "") // remove acentos
        .replace(/[^A-Z0-9\s]/g, "");
      const words = normalized.split(" ").filter((w) => w.length > 1);
      let code = "";
      if (words.length >= 2) {
        code = `${words[0].slice(0, 3)}-${words[1].slice(0, 3)}`;
      } else if (words.length === 1) {
        code = words[0].slice(0, 5);
      } else {
        code = "PROD";
      }
      const rand = Math.floor(100 + Math.random() * 900);
      if (code) {
        // Apenas sugere SKU se o usuário não digitou manualmente ou está editando
        // setSku(`${code}-${rand}`);
      }
    }
  };

  const handleSuggestSKU = () => {
    if (!name) return;
    const normalized = name
      .toUpperCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9\s]/g, "");
    const words = normalized.split(" ").filter((w) => w.length > 1);
    let code = "";
    if (words.length >= 2) {
      code = `${words[0].slice(0, 3)}-${words[1].slice(0, 3)}`;
    } else if (words.length === 1) {
      code = words[0].slice(0, 5);
    } else {
      code = "SKU";
    }
    const rand = Math.floor(100 + Math.random() * 900);
    setSku(`${code}-${rand}`);
  };

  const handleSuggestBarcode = () => {
    // Gerar um código de barras de 13 dígitos simulado
    let code = "789"; // Prefixo de Brasil
    for (let i = 0; i < 10; i++) {
      code += Math.floor(Math.random() * 10).toString();
    }
    setBarcode(code);
  };

  const validate = () => {
    const tempErrors: { [key: string]: string } = {};
    if (!name.trim()) tempErrors.name = "O nome do produto é obrigatório.";
    if (!sku.trim()) tempErrors.sku = "O código SKU é obrigatório.";
    if (currentStock < 0) tempErrors.currentStock = "O estoque não pode ser negativo.";
    if (minStock < 0) tempErrors.minStock = "O estoque mínimo não pode ser negativo.";
    if (price < 0) tempErrors.price = "O preço não pode ser negativo.";
    if (showCustomCategory && !customCategory.trim()) {
      tempErrors.customCategory = "Informe o nome da categoria personalizada.";
    }

    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    const finalCategory = showCustomCategory ? customCategory.trim() : category;

    const productData: Product = {
      id: productToEdit?.id || `prod-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      name: name.trim(),
      sku: sku.trim().toUpperCase(),
      barcode: barcode.trim(),
      category: finalCategory,
      currentStock,
      minStock,
      unit,
      price,
      updatedAt: new Date().toISOString(),
    };

    onSubmit(productData);
    onClose();
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

          {/* Modal Container */}
          <motion.div
            id="product-form-modal"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="bg-[#1E293B] rounded-xl border border-[#334155] shadow-2xl w-full max-w-2xl relative z-10 overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#334155] flex items-center justify-between bg-[#0F172A]/50">
              <div>
                <h3 className="text-lg font-bold font-display text-[#F8FAFC]">
                  {productToEdit ? "Editar Produto" : "Adicionar Novo Produto"}
                </h3>
                <p className="text-xs text-[#94A3B8] font-medium">
                  {productToEdit ? `Ajustando propriedades de: ${productToEdit.name}` : "Cadastre um novo item no catálogo de estoque"}
                </p>
              </div>
              <button
                id="close-modal-btn"
                onClick={onClose}
                className="p-1.5 rounded-lg text-[#94A3B8] hover:text-[#F8FAFC] hover:bg-[#334155] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                  Nome do Produto <span className="text-rose-400">*</span>
                </label>
                <input
                  id="form-product-name"
                  type="text"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="Ex: Arroz Integral Camil 1kg"
                  className={`w-full px-3.5 py-2 rounded-xl border bg-[#0F172A] ${
                    errors.name ? "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500" : "border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                  } text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white placeholder-slate-500`}
                />
                {errors.name && (
                  <p className="text-xs font-semibold text-rose-400 mt-1">{errors.name}</p>
                )}
              </div>

              {/* SKU & Barcode Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* SKU */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>Código SKU <span className="text-rose-400">*</span></span>
                    {name && (
                      <button
                        type="button"
                        onClick={handleSuggestSKU}
                        className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        Sugerir SKU
                      </button>
                    )}
                  </label>
                  <input
                    id="form-product-sku"
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    placeholder="Ex: ARR-CAM-001"
                    className={`w-full px-3.5 py-2 rounded-xl border bg-[#0F172A] ${
                      errors.sku ? "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500" : "border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                    } text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 uppercase text-white placeholder-slate-500`}
                  />
                  {errors.sku && (
                    <p className="text-xs font-semibold text-rose-400 mt-1">{errors.sku}</p>
                  )}
                </div>

                {/* Barcode */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <BarcodeIcon className="w-3.5 h-3.5 text-[#94A3B8]" /> Código de Barras (EAN)
                    </span>
                    <button
                      type="button"
                      onClick={handleSuggestBarcode}
                      className="text-[10px] font-bold text-blue-400 hover:text-blue-300 transition-colors"
                    >
                      Gerar EAN
                    </button>
                  </label>
                  <input
                    id="form-product-barcode"
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    placeholder="Ex: 7891234567890"
                    className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white bg-[#0F172A] placeholder-slate-500"
                  />
                </div>
              </div>

              {/* Category & Unit Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Category */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                    Categoria
                  </label>
                  <select
                    id="form-product-category"
                    value={category}
                    onChange={(e) => {
                      setCategory(e.target.value);
                      setShowCustomCategory(e.target.value === "Outros");
                    }}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white bg-[#0F172A]"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat} className="bg-[#1E293B]">
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Unit */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                    Unidade de Medida
                  </label>
                  <select
                    id="form-product-unit"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white bg-[#0F172A]"
                  >
                    {UNITS.map((u) => (
                      <option key={u} value={u} className="bg-[#1E293B]">
                        {u} (unidades)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Custom Category Input if Outros selected */}
              {showCustomCategory && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="overflow-hidden"
                >
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                    Nome da Categoria Personalizada <span className="text-rose-400">*</span>
                  </label>
                  <input
                    id="form-product-custom-category"
                    type="text"
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Ex: Ferramentas"
                    className={`w-full px-3.5 py-2 rounded-xl border bg-[#0F172A] ${
                      errors.customCategory ? "border-rose-500 focus:ring-rose-500/20 focus:border-rose-500" : "border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6]"
                    } text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white`}
                  />
                  {errors.customCategory && (
                    <p className="text-xs font-semibold text-rose-400 mt-1">{errors.customCategory}</p>
                  )}
                </motion.div>
              )}

              {/* Prices, Stock, Min Stock Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Price */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                    Preço Unitário (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-2.5 text-sm font-semibold text-slate-500">R$</span>
                    <input
                      id="form-product-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={price || ""}
                      onChange={(e) => setPrice(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white bg-[#0F172A] placeholder-slate-500"
                    />
                  </div>
                  {errors.price && (
                    <p className="text-xs font-semibold text-rose-400 mt-1">{errors.price}</p>
                  )}
                </div>

                {/* Stock Inicial / Atual */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5 flex items-center justify-between">
                    <span>Estoque Inicial</span>
                    {!productToEdit && (
                      <span className="text-[10px] text-blue-400 font-semibold lowercase flex items-center gap-1">
                        <Info className="w-2.5 h-2.5" /> gera log inicial
                      </span>
                    )}
                  </label>
                  <input
                    id="form-product-stock"
                    type="number"
                    min="0"
                    disabled={!!productToEdit} // Para edição, forçar uso de ajustes ou auditoria de contagem
                    value={currentStock}
                    onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 disabled:bg-[#1E293B] disabled:text-slate-500 disabled:border-[#334155] text-white bg-[#0F172A]"
                  />
                  {errors.currentStock && (
                    <p className="text-xs font-semibold text-rose-400 mt-1">{errors.currentStock}</p>
                  )}
                </div>

                {/* Estoque Mínimo */}
                <div>
                  <label className="block text-xs font-semibold text-[#94A3B8] uppercase tracking-wide mb-1.5">
                    Estoque Mínimo (Alerta)
                  </label>
                  <input
                    id="form-product-min-stock"
                    type="number"
                    min="0"
                    value={minStock}
                    onChange={(e) => setMinStock(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2 rounded-xl border border-[#334155] focus:ring-[#3B82F6]/20 focus:border-[#3B82F6] text-sm focus:outline-hidden focus:ring-3 transition-shadow duration-150 text-white bg-[#0F172A]"
                  />
                  {errors.minStock && (
                    <p className="text-xs font-semibold text-rose-400 mt-1">{errors.minStock}</p>
                  )}
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="pt-4 border-t border-[#334155] flex items-center justify-end gap-3 bg-[#0F172A]/20 -mx-6 -mb-6 p-6">
                <button
                  id="cancel-modal-btn"
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#334155] text-sm font-semibold text-slate-300 hover:text-white bg-[#334155] hover:bg-[#475569] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  id="save-product-btn"
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-[#3B82F6] hover:bg-blue-600 text-white font-semibold text-sm flex items-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  {productToEdit ? "Salvar Alterações" : "Salvar Produto"}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
